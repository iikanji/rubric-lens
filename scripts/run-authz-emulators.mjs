/**
 * Isolated, non-destructive launch for the authorization integration tests.
 * Deliberately hardcodes a demo project and never invokes firebase deploy.
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const PROJECT = "demo-rubric-lens";
const TEACHER = "security.teacher@example.test";

if (process.env.FIREBASE_EMULATOR_HUB || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error("Run this command from a normal Terminal, not inside an existing emulator session.");
  process.exit(1);
}

const executable = resolve("node_modules/.bin/firebase");
const args = [
  "emulators:exec",
  "--only", "auth,firestore,functions",
  "--project", PROJECT,
  "npm --prefix functions run test:authorization",
];
console.log("Starting LOCAL Firebase emulators for " + PROJECT + ". No live Firebase services are used.");

const child = spawn(executable, args, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    GCLOUD_PROJECT: PROJECT,
    GOOGLE_CLOUD_PROJECT: PROJECT,
    TEACHER_EMAILS: TEACHER,
    // Avoid inheriting credentials meant for a live Firebase project.
    GOOGLE_APPLICATION_CREDENTIALS: "",
  },
});
child.on("error", error => { console.error(error); process.exitCode = 1; });
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
