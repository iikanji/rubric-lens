import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT = "demo-rubric-lens";
const AUTH_HOST = "127.0.0.1:9099";
const FIRESTORE_HOST = "127.0.0.1:8080";
const FUNCTIONS_ORIGIN = "http://127.0.0.1:5001";
const TEACHER_EMAIL = "security.teacher@example.test";

function assertDemoOnly() {
  if (
    process.env.GCLOUD_PROJECT !== PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT !== PROJECT ||
    !process.env.FIREBASE_EMULATOR_HUB ||
    !["127.0.0.1:8080", "localhost:8080"].includes(process.env.FIRESTORE_EMULATOR_HOST ?? "") ||
    !["127.0.0.1:9099", "localhost:9099"].includes(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "")
  ) throw new Error(
    "SECURITY STOP: This test must run inside the demo-rubric-lens Auth, Firestore and Functions emulators. No live project permitted."
  );
}

assertDemoOnly();
const app = initializeApp({ projectId: PROJECT });
const db = getFirestore(app);
const baseId = "authz-" + randomUUID().replaceAll("-", "").slice(0, 20);
const classId = baseId;
const rubricId = baseId + "-rubric";
const sessionId = "test-session";
const presentationId = "open-presentation";
const secondPresentationId = "revocation-presentation";
const assignmentA = "assignment-a";
const assignmentB = "assignment-b";

type MockAccount = { uid: string; idToken: string; email: string; name: string };

async function googleAccount(sub: string, email: string, name: string): Promise<MockAccount> {
  // Firebase Auth emulator documents a literal JSON mock ID token for Google.
  // This never calls accounts.google.com or production Identity Toolkit.
  const mockGoogleToken = JSON.stringify({ sub, email, email_verified: true, name });
  const response = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=local-test-only`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestUri: "http://localhost",
        postBody: new URLSearchParams({
          id_token: mockGoogleToken, providerId: "google.com",
        }).toString(),
        returnSecureToken: true,
      }),
    },
  );
  const result = await response.json() as Record<string, any>;
  assert.equal(response.status, 200, `Google emulator mock sign-in failed: ${JSON.stringify(result)}`);
  assert.ok(result.idToken && result.localId, "Authentication emulator must issue a token and UID.");
  // Confirm test tokens actually represent verified Google accounts.
  const payload = JSON.parse(Buffer.from(String(result.idToken).split(".")[1], "base64url").toString());
  assert.equal(payload.firebase?.sign_in_provider, "google.com");
  assert.equal(payload.email_verified, true);
  return { uid: result.localId, idToken: result.idToken, email, name };
}

async function callable(name: string, idToken: string, data: Record<string, unknown>) {
  const response = await fetch(`${FUNCTIONS_ORIGIN}/${PROJECT}/asia-northeast1/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(12000),
  });
  const json = await response.json() as { result?: any; error?: { status?: string; message?: string } };
  return { status: response.status, ...json };
}

async function allowed(name: string, idToken: string, data: Record<string, unknown>) {
  const answer = await callable(name, idToken, data);
  assert.equal(answer.status, 200, `${name} rejected unexpectedly: ${JSON.stringify(answer)}`);
  assert.ok("result" in answer, `${name} response missing result`);
  return answer.result;
}

async function denied(name: string, idToken: string, data: Record<string, unknown>, reason: string) {
  const answer = await callable(name, idToken, data);
  assert.equal(answer.error?.status, reason, `${name} should return ${reason}, got ${JSON.stringify(answer)}`);
  assert.ok(answer.status >= 400 && answer.status < 500, "Expected a deliberate client denial, not a server crash.");
}

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

test("live callable authorization, fully isolated in demo emulators", async t => {
  const suffix = baseId.slice(-10);
  const teacher = await googleAccount("teacher-" + suffix, TEACHER_EMAIL, "Security Test Teacher");
  const alice = await googleAccount("alice-" + suffix, "security.alice." + suffix + "@example.test", "Security Alice");
  const bob = await googleAccount("bob-" + suffix, "security.bob." + suffix + "@example.test", "Security Bob");
  const outsider = await googleAccount("outsider-" + suffix, "security.outsider." + suffix + "@example.test", "Security Outsider");

  const rubric = {
    id: "c0", title: "Organization", description: "Group-level organization", scope: "group",
    studentEligible: true, expertEligible: true, minScore: 0, maxScore: 3,
    descriptors: ["None", "Limited", "Developing", "Strong"],
  };
  const presentationRef = db.doc(`classes/${classId}/sessions/${sessionId}/presentations/${presentationId}`);
  const secondRef = db.doc(`classes/${classId}/sessions/${sessionId}/presentations/${secondPresentationId}`);
  const batch = db.batch();
  batch.set(db.doc(`classes/${classId}`), { name: "Synthetic Test Class", ownerUid: teacher.uid, rubricId });
  batch.set(db.doc(`rubrics/${rubricId}`), { ownerUid: teacher.uid, title: "Synthetic Test Rubric", criteria: [rubric] });
  batch.set(db.doc(`classes/${classId}/sessions/${sessionId}`), { title: "Synthetic Test Session", classId, ownerUid: teacher.uid, rubricId, state: "live" });
  for (const p of [presentationRef, secondRef]) {
    batch.set(p, {
      title: "Synthetic Test Presentation", state: "live", window: "open",
      presenters: [{ uid: outsider.uid, displayName: outsider.name }],
    });
    for (const [a, assId] of [[alice, assignmentA], [bob, assignmentB]] as const) {
      const assignment = {
        raterUid: a.uid, criterionId: "c0", targetUid: null, targetName: "Presenting group",
        minScore: 0, maxScore: 3, scope: "group",
        classId, sessionId, presentationId: p.id,
      };
      batch.set(p.collection("assignments").doc(assId), assignment);
      batch.set(db.doc(`users/${a.uid}/assignments/${p.id}-${assId}`), assignment);
    }
  }
  for (const account of [alice, bob]) {
    const key = sha(account.email);
    batch.set(db.doc(`classes/${classId}/members/${account.uid}`), {
      uid: account.uid, name: account.name, email: account.email, active: true,
    });
    batch.set(db.doc(`classes/${classId}/invites/${key}`), {
      email: account.email, name: account.name, classId, claimedUid: account.uid, revoked: false,
    });
    batch.set(db.doc(`emailInvites/${key}/classes/${classId}`), { classId });
  }
  await batch.commit();

  const ratingPath = `classes/${classId}/sessions/${sessionId}/presentations/${presentationId}/ratings/${assignmentA}`;

  await t.test("authorized control: teacher can read results and owner can submit", async () => {
    await allowed("getTeacherPresentation", teacher.idToken, { classId, sessionId, presentationId });
    await allowed("saveStudentRating", alice.idToken, {
      classId, sessionId, presentationId, assignmentId: assignmentA, score: 2, comment: "Allowed control", submit: true,
    });
    const snapshot = await db.doc(ratingPath).get();
    assert.equal(snapshot.get("score"), 2);
  });

  await t.test("another student cannot write Alice's rating", async () => {
    await denied("saveStudentRating", bob.idToken, {
      classId, sessionId, presentationId, assignmentId: assignmentA, score: 0, comment: "Unauthorized", submit: true,
    }, "PERMISSION_DENIED");
    assert.equal((await db.doc(ratingPath).get()).get("score"), 2);
  });

  await t.test("student cannot read teacher-only scores or submit expert rating", async () => {
    await denied("getTeacherPresentation", alice.idToken, {
      classId, sessionId, presentationId,
    }, "PERMISSION_DENIED");
    await denied("saveExpertRating", bob.idToken, {
      classId, sessionId, presentationId, criterionId: "c0", score: 3, comment: "Unauthorized",
    }, "PERMISSION_DENIED");
  });

  await t.test("non-member cannot submit", async () => {
    await denied("saveStudentRating", outsider.idToken, {
      classId, sessionId, presentationId, assignmentId: assignmentA, score: 0, submit: true,
    }, "PERMISSION_DENIED");
  });

  await t.test("closing the assessment window blocks further submissions", async () => {
    await allowed("closePresentation", teacher.idToken, { classId, sessionId, presentationId });
    await denied("saveStudentRating", alice.idToken, {
      classId, sessionId, presentationId, assignmentId: assignmentA, score: 3, submit: true,
    }, "FAILED_PRECONDITION");
    assert.equal((await db.doc(ratingPath).get()).get("score"), 2);
  });

  await t.test("revoked member cannot rate or list assigned work", async () => {
    await allowed("saveStudentRating", bob.idToken, {
      classId, sessionId, presentationId: secondPresentationId, assignmentId: assignmentB,
      score: 2, submit: true,
    });
    await allowed("removeRosterStudent", teacher.idToken, { classId, email: bob.email });
    const member = await db.doc(`classes/${classId}/members/${bob.uid}`).get();
    assert.equal(member.get("active"), false);
    await denied("saveStudentRating", bob.idToken, {
      classId, sessionId, presentationId: secondPresentationId, assignmentId: assignmentB,
      score: 3, submit: true,
    }, "PERMISSION_DENIED");
    const listed = await allowed("listStudentAssignments", bob.idToken, {});
    assert.deepEqual(listed.assignments, []);
    const stored = await secondRef.collection("ratings").doc(assignmentB).get();
    assert.equal(stored.get("score"), 2);
  });

  // Emulator data disappears when emulators:exec exits. No live cleanup needed.
});
