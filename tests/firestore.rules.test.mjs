import test from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";

const env = await initializeTestEnvironment({
  projectId: "demo-rubric-lens",
  firestore: {
    rules: readFileSync("firestore.rules", "utf8"),
    host: "127.0.0.1",
    port: 8080,
  },
});
test.after(async () => { await env.cleanup(); });
const teacher = env.authenticatedContext("teacher1", { email: "t@example.edu", email_verified: true, teacher: true });
const studentA = env.authenticatedContext("student-a", { email: "a@example.edu", email_verified: true });
const studentB = env.authenticatedContext("student-b", { email: "b@example.edu", email_verified: true });
const studentDb = studentA.firestore();

await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await db.doc("classes/class1").set({ ownerUid: "teacher1", name: "Class 1" });
  await db.doc("classes/class2").set({ ownerUid: "other", name: "Class 2" });
  await db.doc("classes/class1/members/student-a").set({ uid: "student-a", active: true });
  await db.doc("classes/class1/members/student-b").set({ uid: "student-b", active: true });
  await db.doc("classes/class1/sessions/s1/presentations/p1/assignments/a1").set({ raterUid: "student-a" });
  await db.doc("classes/class1/sessions/s1/presentations/p1/ratings/a1").set({ raterUid: "student-a", score: 2 });
  await db.doc("users/student-a").set({ displayName: "Student A" });
  await db.doc("users/student-b").set({ displayName: "Student B" });
  await db.doc("users/student-a/assignments/a1").set({ classId: "class1", raterUid: "student-a" });
  await db.doc("classes/class1/invites/hashed").set({ email: "a@example.edu" });
});
test("teacher reads own class but not another teacher's class", async () => {
  await assertSucceeds(teacher.firestore().doc("classes/class1").get());
  await assertFails(teacher.firestore().doc("classes/class2").get());
});
test("student cannot read class, roster or another student's user record", async () => {
  await assertFails(studentDb.doc("classes/class1").get());
  await assertFails(studentDb.doc("classes/class1/members/student-b").get());
  await assertFails(studentDb.doc("users/student-b").get());
  await assertSucceeds(studentDb.doc("users/student-a").get());
});
test("student cannot read other submissions or invite emails", async () => {
  await assertFails(studentDb.doc("classes/class1/sessions/s1/presentations/p1/ratings/a1").get());
  await assertFails(studentB.firestore().doc("users/student-a/assignments/a1").get());
  await assertFails(studentDb.doc("classes/class1/invites/hashed").get());
});
test("direct client writes always forbidden", async () => {
  await assertFails(studentDb.doc("classes/class1/sessions/s1/presentations/p1/ratings/a1").set({ score: 3 }));
  await assertFails(studentDb.doc("users/student-a").set({ role: "teacher" }));
  await assertFails(teacher.firestore().doc("classes/class1").set({ ownerUid: "teacher1" }));
});
test("student's assigned projection is readable only while enrolled", async () => {
  await assertSucceeds(studentDb.doc("users/student-a/assignments/a1").get());
  await env.withSecurityRulesDisabled(async ctx => {
    await ctx.firestore().doc("classes/class1/members/student-a").update({ active: false });
  });
  await assertFails(studentDb.doc("users/student-a/assignments/a1").get());
});
