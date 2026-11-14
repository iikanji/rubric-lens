import { createHash } from "node:crypto";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { allocateFixed, type Criterion, type Rater, type Target } from "./allocation";

if (!getApps().length) initializeApp();
const db = getFirestore();
const adminAuth = getAuth();
const REGION = "asia-northeast1";
const options = { region: REGION, maxInstances: 10 };

type Data = Record<string, unknown>;
const text = (x: unknown, max = 160): string =>
  typeof x === "string" ? x.trim().slice(0, max) : "";
const email = (x: unknown): string => text(x, 250).toLowerCase();
const sha = (x: string): string => createHash("sha256").update(x).digest("hex");
const requireId = (x: unknown): string => {
  if (typeof x !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(x))
    throw new HttpsError("invalid-argument", "Invalid identifier.");
  return x;
};
const input = (x: unknown): Data => x && typeof x === "object" && !Array.isArray(x) ? x as Data : {};
function user(req: CallableRequest) {
  if (!req.auth || req.auth.token.email_verified !== true || !req.auth.token.email)
    throw new HttpsError("unauthenticated", "Sign in using a verified Google account.");
  if (req.auth.token.firebase?.sign_in_provider !== "google.com")
    throw new HttpsError("permission-denied", "Google Sign-In is required.");
  return { uid: req.auth.uid, email: email(req.auth.token.email), name: text(req.auth.token.name, 100) };
}
function teacher(req: CallableRequest) {
  const current = user(req);
  const allowed = (process.env.TEACHER_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length)
    throw new HttpsError("failed-precondition", "Teacher allowlist has not been configured.");
  if (!allowed.includes(current.email))
    throw new HttpsError("permission-denied", "Teacher permission required.");
  return current;
}
async function ownClass(classId: string, uid: string) {
  const ref = db.doc(`classes/${classId}`);
  const snap = await ref.get();
  if (!snap.exists || snap.get("ownerUid") !== uid)
    throw new HttpsError("permission-denied", "Class not found or inaccessible.");
  return { ref, value: snap.data()! };
}
async function activeMember(classId: string, uid: string) {
  const snap = await db.doc(`classes/${classId}/members/${uid}`).get();
  if (!snap.exists || snap.get("active") !== true)
    throw new HttpsError("permission-denied", "Not an active class member.");
}
async function validPresentation(classId: string, sessionId: string, presentationId: string) {
  const sessionRef = db.doc(`classes/${classId}/sessions/${sessionId}`);
  const pRef = sessionRef.collection("presentations").doc(presentationId);
  const [s, p] = await Promise.all([sessionRef.get(), pRef.get()]);
  if (!s.exists || !p.exists) throw new HttpsError("not-found", "Presentation not found.");
  return { sessionRef, pRef, session: s.data()!, presentation: p.data()! };
}
function validateCriteria(data: unknown): Criterion[] {
  if (!Array.isArray(data) || data.length < 1 || data.length > 24)
    throw new HttpsError("invalid-argument", "Provide 1–24 rubric criteria.");
  return data.map((v: unknown, i: number) => {
    const c = input(v);
    const title = text(c.title, 100);
    if (!title) throw new HttpsError("invalid-argument", "Criterion title required.");
    const scope = c.scope === "individual" ? "individual" : "group";
    const descriptors = c.descriptors;
    if (!Array.isArray(descriptors) || descriptors.length !== 4 || descriptors.some(d => typeof d !== "string" || !d.trim() || d.length > 400))
      throw new HttpsError("invalid-argument", "Pilot criteria require four nonempty 0–3 descriptors.");
    const studentEligible = c.studentEligible !== false;
    const expertEligible = c.expertEligible !== false;
    if (!studentEligible && !expertEligible)
      throw new HttpsError("invalid-argument", "At least one rater type must be eligible.");
    return {
      id: `c${i}`, title, description: text(c.description, 1200), scope,
      studentEligible, expertEligible, minScore: 0, maxScore: 3,
      descriptors: descriptors.map((d: string) => d.trim()),
    };
  });
}

export const bootstrapTeacher = onCall(options, async req => {
  const actor = teacher(req);
  const record = await adminAuth.getUser(actor.uid);
  await adminAuth.setCustomUserClaims(actor.uid, { ...record.customClaims, teacher: true });
  await db.doc(`users/${actor.uid}`).set({
    displayName: actor.name, email: actor.email, role: "teacher", updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { role: "teacher", refreshToken: true };
});

export const createClass = onCall(options, async req => {
  const actor = teacher(req);
  const data = input(req.data);
  const name = text(data.name, 100);
  if (!name) throw new HttpsError("invalid-argument", "Class name required.");
  let rubricId: string | null = null;
  if (data.rubricId) {
    rubricId = requireId(data.rubricId);
    const rubric = await db.doc(`rubrics/${rubricId}`).get();
    if (!rubric.exists || rubric.get("ownerUid") !== actor.uid)
      throw new HttpsError("permission-denied", "Rubric not accessible.");
  }
  const ref = db.collection("classes").doc();
  await ref.set({
    name, projectName: text(data.projectName, 100) || name,
    ownerUid: actor.uid, rubricId, createdAt: FieldValue.serverTimestamp(),
  });
  return { classId: ref.id };
});

export const listMyClasses = onCall(options, async req => {
  const actor = user(req);
  const allowed = (process.env.TEACHER_EMAILS || "").split(",").map(s => s.trim().toLowerCase());
  if (allowed.includes(actor.email)) {
    const snap = await db.collection("classes").where("ownerUid", "==", actor.uid).limit(30).get();
    return { role: "teacher", classes: snap.docs.map(d => ({ id: d.id, name: d.get("name"), projectName: d.get("projectName") })) };
  }
  const snap = await db.collection(`users/${actor.uid}/classes`).limit(30).get();
  const entries = await Promise.all(snap.docs.map(async d => {
    const member = await db.doc(`classes/${d.id}/members/${actor.uid}`).get();
    return member.get("active") === true ? { id: d.id, name: d.get("name") } : null;
  }));
  return { role: "student", classes: entries.filter(Boolean) };
});

export const importRoster = onCall(options, async req => {
  const actor = teacher(req);
  const data = input(req.data);
  const classId = requireId(data.classId);
  await ownClass(classId, actor.uid);
  if (!Array.isArray(data.rows) || data.rows.length < 1 || data.rows.length > 150)
    throw new HttpsError("invalid-argument", "Import 1–150 rows at a time.");
  const domain = (process.env.STUDENT_EMAIL_DOMAIN || "").toLowerCase().trim();
  const entries = new Map<string, string>();
  for (const row of data.rows) {
    const item = input(row);
    const address = email(item.email);
    const name = text(item.name, 100);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
      throw new HttpsError("invalid-argument", "All roster rows need valid names and emails.");
    if (domain && !address.endsWith("@" + domain))
      throw new HttpsError("invalid-argument", "Roster email outside configured school domain.");
    if (entries.has(address))
      throw new HttpsError("invalid-argument", "Duplicate roster email: " + address);
    entries.set(address, name);
  }
  // Additive import only. Revocation and record replacement will have dedicated audited actions.
  const batch = db.batch();
  for (const [address, name] of entries) {
    const key = sha(address);
    batch.set(db.doc(`classes/${classId}/invites/${key}`), {
      name, email: address, classId, createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(db.doc(`emailInvites/${key}/classes/${classId}`), {
      classId, createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
  return { imported: entries.size };
});

export const claimRosterInvitations = onCall(options, async req => {
  const actor = user(req);
  const key = sha(actor.email);
  const links = await db.collection(`emailInvites/${key}/classes`).limit(30).get();
  let joined = 0;
  for (const link of links.docs) {
    const classId = link.id;
    const inviteRef = db.doc(`classes/${classId}/invites/${key}`);
    const memberRef = db.doc(`classes/${classId}/members/${actor.uid}`);
    await db.runTransaction(async tx => {
      const invite = await tx.get(inviteRef);
      if (!invite.exists || invite.get("email") !== actor.email)
        throw new HttpsError("permission-denied", "Roster invitation mismatch.");
      if (invite.get("claimedUid") && invite.get("claimedUid") !== actor.uid)
        throw new HttpsError("permission-denied", "Roster entry already claimed.");
      tx.set(memberRef, { uid: actor.uid, name: invite.get("name"), email: actor.email, active: true }, { merge: true });
      tx.set(db.doc(`users/${actor.uid}`), {
        displayName: actor.name, email: actor.email, role: "student", updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      const cls = await tx.get(db.doc(`classes/${classId}`));
      if (!cls.exists) throw new HttpsError("not-found", "Class removed.");
      tx.set(db.doc(`users/${actor.uid}/classes/${classId}`), { name: cls.get("name"), classId });
      tx.set(inviteRef, { claimedUid: actor.uid }, { merge: true });
    });
    joined++;
  }
  return { joined };
});

export const saveClassRubric = onCall(options, async req => {
  const actor = teacher(req);
  const data = input(req.data);
  const classId = requireId(data.classId);
  const { ref } = await ownClass(classId, actor.uid);
  const criteria = validateCriteria(data.criteria);
  const rubricRef = db.collection("rubrics").doc();
  const batch = db.batch();
  batch.set(rubricRef, {
    ownerUid: actor.uid, title: text(data.title, 100) || "Presentation rubric",
    criteria, scaleMin: 0, scaleMax: 3, version: 1,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(ref, { rubricId: rubricRef.id });
  await batch.commit();
  return { rubricId: rubricRef.id };
});

export const createSession = onCall(options, async req => {
  const actor = teacher(req);
  const data = input(req.data);
  const classId = requireId(data.classId);
  const { ref, value } = await ownClass(classId, actor.uid);
  if (!value.rubricId) throw new HttpsError("failed-precondition", "Create a rubric first.");
  const sessionRef = ref.collection("sessions").doc();
  await sessionRef.set({
    title: text(data.title, 100) || "Presentation session",
    classId, rubricId: value.rubricId, ownerUid: actor.uid,
    state: "draft", createdAt: FieldValue.serverTimestamp(),
  });
  return { sessionId: sessionRef.id };
});

export const createPresentation = onCall(options, async req => {
  const actor = teacher(req);
  const data = input(req.data);
  const classId = requireId(data.classId);
  const sessionId = requireId(data.sessionId);
  await ownClass(classId, actor.uid);
  const sessionRef = db.doc(`classes/${classId}/sessions/${sessionId}`);
  const session = await sessionRef.get();
  if (!session.exists) throw new HttpsError("not-found", "Session not found.");
  if (!Array.isArray(data.presenterUids) || !data.presenterUids.length || data.presenterUids.length > 15)
    throw new HttpsError("invalid-argument", "Select 1–15 presenters.");
  const uids = [...new Set(data.presenterUids.map(requireId))];
  const presenters = await Promise.all(uids.map(async uid => {
    const member = await db.doc(`classes/${classId}/members/${uid}`).get();
    if (!member.exists || member.get("active") !== true)
      throw new HttpsError("invalid-argument", "Presenter must be an active class member.");
    return { uid, displayName: member.get("name") as string };
  }));
  const pRef = sessionRef.collection("presentations").doc();
  await pRef.set({
    title: text(data.title, 100) || presenters.map(p => p.displayName).join(", "),
    presenters, state: "planned", window: "not_open", assignmentsGenerated: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { presentationId: pRef.id };
});

export const openPresentation = onCall(options, async req => {
  const actor = teacher(req);
  const data = input(req.data);
  const classId = requireId(data.classId);
  const sessionId = requireId(data.sessionId);
  const presentationId = requireId(data.presentationId);
  await ownClass(classId, actor.uid);
  const { pRef, session, presentation, sessionRef } = await validPresentation(classId, sessionId, presentationId);
  if (presentation.window === "closed")
    throw new HttpsError("failed-precondition", "Closed windows require an explicit reopening workflow.");
  if (presentation.window === "open") return { opened: true, existing: true };
  const rubricDoc = await db.doc(`rubrics/${session.rubricId}`).get();
  if (!rubricDoc.exists) throw new HttpsError("not-found", "Session rubric missing.");
  const criteria = rubricDoc.get("criteria") as Criterion[];
  const members = await db.collection(`classes/${classId}/members`).where("active", "==", true).limit(150).get();
  const raters: Rater[] = members.docs.map(d => ({ uid: d.id, displayName: d.get("name") as string }));
  const presenters = presentation.presenters as Target[];
  const { assignments, uncovered } = allocateFixed(
    raters, presenters, criteria, sessionId, presentationId,
    data.individualMode === "all" ? "all" : "single",
  );
  if (assignments.length > 190)
    throw new HttpsError("resource-exhausted", "Too many assignments for one pilot presentation.");
  const batch = db.batch();
  for (const assignment of assignments) {
    const ref = pRef.collection("assignments").doc();
    const criterion = criteria.find(c => c.id === assignment.criterionId)!;
    const snapshot = {
      ...assignment, classId, sessionId, presentationId,
      criterionTitle: criterion.title, description: criterion.description,
      minScore: criterion.minScore, maxScore: criterion.maxScore, descriptors: criterion.descriptors,
      scope: criterion.scope, createdAt: FieldValue.serverTimestamp(),
    };
    batch.set(ref, snapshot);
    batch.set(db.doc(`users/${assignment.raterUid}/assignments/${ref.id}`), {
      ...snapshot, assignmentId: ref.id,
    });
  }
  batch.update(pRef, { assignmentsGenerated: true, window: "open", state: "live", uncovered });
  batch.update(sessionRef, { state: "live" });
  await batch.commit();
  return { opened: true, count: assignments.length, uncovered };
});

export const closePresentation = onCall(options, async req => {
  const actor = teacher(req);
  const data = input(req.data);
  const classId = requireId(data.classId);
  await ownClass(classId, actor.uid);
  const { pRef, presentation } = await validPresentation(
    classId, requireId(data.sessionId), requireId(data.presentationId),
  );
  if (presentation.window !== "open")
    throw new HttpsError("failed-precondition", "Only an open assessment window can be closed.");
  await pRef.update({
    window: "closed", state: "completed", completedAt: FieldValue.serverTimestamp(),
  });
  return { closed: true };
});

export const listStudentAssignments = onCall(options, async req => {
  const actor = user(req);
  const snap = await db.collection(`users/${actor.uid}/assignments`).limit(200).get();
  const results = await Promise.all(snap.docs.map(async d => {
    const a = d.data();
    const member = await db.doc(`classes/${a.classId}/members/${actor.uid}`).get();
    if (!member.exists || member.get("active") !== true) return null;
    const pRef = db.doc(`classes/${a.classId}/sessions/${a.sessionId}/presentations/${a.presentationId}`);
    const [p, rating] = await Promise.all([
      pRef.get(), pRef.collection("ratings").doc(d.id).get(),
    ]);
    if (!p.exists) return null;
    return {
      ...a, assignmentId: d.id, presentationTitle: p.get("title"),
      window: p.get("window"), rating: rating.exists ? {
        score: rating.get("score") ?? null,
        comment: rating.get("comment") ?? "",
        status: rating.get("status") ?? "draft",
      } : null,
    };
  }));
  return { assignments: results.filter(Boolean) };
});

export const saveStudentRating = onCall(options, async req => {
  const actor = user(req);
  const data = input(req.data);
  const classId = requireId(data.classId);
  const sessionId = requireId(data.sessionId);
  const presentationId = requireId(data.presentationId);
  const assignmentId = requireId(data.assignmentId);
  await activeMember(classId, actor.uid);
  const { pRef, presentation } = await validPresentation(classId, sessionId, presentationId);
  if (presentation.window !== "open")
    throw new HttpsError("failed-precondition", "Assessment window is not open.");
  const assignment = await pRef.collection("assignments").doc(assignmentId).get();
  if (!assignment.exists || assignment.get("raterUid") !== actor.uid)
    throw new HttpsError("permission-denied", "This criterion is not assigned to you.");
  const score = data.score === null || data.score === undefined || data.score === "" ? null : Number(data.score);
  const status = data.submit === true ? "submitted" : "draft";
  if (score !== null && (!Number.isInteger(score) || score < assignment.get("minScore") || score > assignment.get("maxScore")))
    throw new HttpsError("invalid-argument", "Score outside rubric scale.");
  if (status === "submitted" && score === null)
    throw new HttpsError("invalid-argument", "Select a score before submitting.");
  const comment = text(data.comment, 2500);
  await pRef.collection("ratings").doc(assignmentId).set({
    assignmentId, raterUid: actor.uid,
    criterionId: assignment.get("criterionId"),
    targetUid: assignment.get("targetUid"),
    score, comment, status,
    updatedAt: FieldValue.serverTimestamp(),
    ...(status === "submitted" ? { submittedAt: FieldValue.serverTimestamp() } : {}),
  }, { merge: true });
  return { saved: true, status };
});

export const saveExpertRating = onCall(options, async req => {
  const actor = teacher(req);
  const data = input(req.data);
  const classId = requireId(data.classId);
  await ownClass(classId, actor.uid);
  const { pRef, session, presentation } = await validPresentation(
    classId, requireId(data.sessionId), requireId(data.presentationId),
  );
  if (presentation.window !== "open")
    throw new HttpsError("failed-precondition", "Assessment window closed.");
  const rubric = await db.doc(`rubrics/${session.rubricId}`).get();
  const criterion = (rubric.get("criteria") as Criterion[]).find(c => c.id === data.criterionId);
  if (!criterion || !criterion.expertEligible)
    throw new HttpsError("invalid-argument", "Expert cannot assess this criterion.");
  const targetUid = criterion.scope === "group" ? null : requireId(data.targetUid);
  if (targetUid && !(presentation.presenters as Target[]).some(p => p.uid === targetUid))
    throw new HttpsError("invalid-argument", "Unknown presenter.");
  const score = Number(data.score);
  if (!Number.isInteger(score) || score < criterion.minScore || score > criterion.maxScore)
    throw new HttpsError("invalid-argument", "Invalid rubric score.");
  const key = `${criterion.id}_${targetUid ?? "group"}`;
  await pRef.collection("expertRatings").doc(key).set({
    criterionId: criterion.id, targetUid,
    expertUid: actor.uid, score, comment: text(data.comment, 2500),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { saved: true };
});

export const getTeacherClass = onCall(options, async req => {
  const actor = teacher(req);
  const classId = requireId(input(req.data).classId);
  const { value } = await ownClass(classId, actor.uid);
  const [roster, invitations, sessions, rubric] = await Promise.all([
    db.collection(`classes/${classId}/members`).limit(150).get(),
    db.collection(`classes/${classId}/invites`).limit(150).get(),
    db.collection(`classes/${classId}/sessions`).limit(30).get(),
    value.rubricId ? db.doc(`rubrics/${value.rubricId}`).get() : Promise.resolve(null),
  ]);
  const sessionList = await Promise.all(sessions.docs.map(async s => {
    const ps = await s.ref.collection("presentations").limit(60).get();
    return {
      id: s.id, title: s.get("title"), state: s.get("state"),
      presentations: ps.docs.map(p => ({
        id: p.id, title: p.get("title"), state: p.get("state"),
        window: p.get("window"), uncovered: p.get("uncovered") ?? [],
      })),
    };
  }));
  return {
    class: { id: classId, name: value.name, projectName: value.projectName },
    rubric: rubric?.exists ? { id: rubric.id, title: rubric.get("title"), criteria: rubric.get("criteria") } : null,
    members: roster.docs.map(d => ({ uid: d.id, name: d.get("name"), email: d.get("email") })),
    invitations: invitations.docs.map(d => ({ name: d.get("name"), email: d.get("email"), claimed: !!d.get("claimedUid") })),
    sessions: sessionList,
  };
});

export const getTeacherPresentation = onCall(options, async req => {
  const actor = teacher(req);
  const data = input(req.data);
  const classId = requireId(data.classId);
  const sessionId = requireId(data.sessionId);
  const presentationId = requireId(data.presentationId);
  await ownClass(classId, actor.uid);
  const { pRef, session, presentation } = await validPresentation(classId, sessionId, presentationId);
  const rubric = await db.doc(`rubrics/${session.rubricId}`).get();
  const criteria = rubric.get("criteria") as Criterion[];
  const [a, r, e] = await Promise.all([
    pRef.collection("assignments").limit(200).get(),
    pRef.collection("ratings").limit(200).get(),
    pRef.collection("expertRatings").limit(200).get(),
  ]);
  const ratings = new Map(r.docs.map(d => [d.id, d.data()]));
  const assignments = a.docs.map(d => ({ id: d.id, ...d.data(), rating: ratings.get(d.id) ?? null }));
  const experts = e.docs.map(d => d.data());
  const results = criteria.flatMap(c => {
    const targets = c.scope === "group"
      ? [{ uid: null, displayName: "Presenting group" }]
      : presentation.presenters as Target[];
    return targets.map(target => {
      const peer = assignments.filter(a => a.criterionId === c.id && a.targetUid === target.uid && a.rating?.status === "submitted")
        .map(a => a.rating?.score).filter((x): x is number => typeof x === "number");
      const expert = experts.filter(x => x.criterionId === c.id && x.targetUid === target.uid);
      return {
        criterionId: c.id, criterionTitle: c.title, targetUid: target.uid, targetName: target.displayName,
        peerCount: peer.length, peerScores: peer, peerAverage: peer.length ? peer.reduce((x,y) => x+y, 0)/peer.length : null,
        expertScores: expert.map(x => x.score), expertAverage: expert.length ? expert.reduce((x,y) => x+y.score,0)/expert.length : null,
      };
    });
  });
  return { presentation: { id: presentationId, ...presentation }, assignments, experts, results };
});
