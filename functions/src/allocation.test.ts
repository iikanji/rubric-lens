import test from "node:test";
import assert from "node:assert/strict";
import { allocateFixed, type Criterion } from "./allocation";

const criteria: Criterion[] = [
  { id: "org", title: "Organization", description: "", scope: "group", studentEligible: true, expertEligible: true, minScore: 0, maxScore: 3, descriptors: ["", "", "", ""] },
  { id: "eye", title: "Eye contact", description: "", scope: "individual", studentEligible: true, expertEligible: false, minScore: 0, maxScore: 3, descriptors: ["", "", "", ""] },
];
const raters = Array.from({ length: 14 }, (_, i) => ({ uid: "u" + i, displayName: "Student " + i }));
const presenters = [{ uid: "u0", displayName: "Presenter A" }, { uid: "u1", displayName: "Presenter B" }];

test("never assigns presenters to their own performance", () => {
  const { assignments } = allocateFixed(raters, presenters, criteria, "session", "p1");
  assert.ok(assignments.length > 0);
  for (const a of assignments) assert.ok(!["u0", "u1"].includes(a.raterUid));
});

test("criterion is stable across presentations", () => {
  const first = allocateFixed(raters, presenters, criteria, "session", "p1");
  const next = allocateFixed(raters, [{ uid: "u2", displayName: "Other" }], criteria, "session", "p2");
  for (const a of first.assignments) {
    const subsequent = next.assignments.filter((b) => b.raterUid === a.raterUid);
    if (a.raterUid === "u2") continue; // Now presenting; excluded by design.
    assert.ok(subsequent.length > 0);
    assert.ok(subsequent.every((b) => b.criterionId === a.criterionId));
  }
});

test("assignment is deterministic and each target is represented when possible", () => {
  const a = allocateFixed(raters, presenters, criteria, "session", "p1");
  const b = allocateFixed(raters, presenters, criteria, "session", "p1");
  assert.deepEqual(a, b);
  assert.deepEqual(a.uncovered, []);
});

test("all-presenters mode assigns individual criterion to every presenter", () => {
  const { assignments } = allocateFixed(raters, presenters, criteria, "session", "p1", "all");
  const eye = assignments.filter((a) => a.criterionId === "eye");
  assert.equal(eye.length % 2, 0);
  assert.ok(eye.some((a) => a.targetUid === "u0"));
  assert.ok(eye.some((a) => a.targetUid === "u1"));
});

test("student-ineligible criteria are never allocated", () => {
  const c = [...criteria, { ...criteria[0], id: "expert", studentEligible: false }];
  const { assignments } = allocateFixed(raters, presenters, c, "session", "p1");
  assert.ok(assignments.every((a) => a.criterionId !== "expert"));
});
