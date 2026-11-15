# Local authorization integration test

Run from the Rubric Lens repository root:

```bash
npm run test:authz
```

This command builds the Cloud Functions locally and launches **Firebase Auth, Firestore, and Functions emulators** under the hard-coded project ID `demo-rubric-lens`. It uses fabricated Google-provider identities issued by the **Auth emulator** and synthetic Firestore fixtures; no real Google login, API key, student account, or service-account key is required. The Functions code under test is the application code.

Safety properties:

- The runner uses `--project demo-rubric-lens` regardless of `firebase use` / `.firebaserc`, and starts only emulators (never `firebase deploy`).
- The integration test exits before writing unless `GCLOUD_PROJECT`, `GOOGLE_CLOUD_PROJECT`, the emulator hub, and both Auth and Firestore emulator hosts have the expected local values.
- Admin Firestore writes are restricted to the Firestore emulator; callable requests are sent only to `http://127.0.0.1:5001/demo-rubric-lens/asia-northeast1`.
- A dummy test-only teacher allowlist is injected into the emulator subprocess; the test runner does not change `functions/.env.rubric-lens-027` or any existing config.
- The test checks a legitimate baseline action, another user's assignment rejection, student access to teacher data, outsider access, post-closure rejection, and revocation behavior.
- Every denied operation must return the expected authorization/precondition error, not merely any error; existing rating values must remain unchanged.

Requires Node 22+, Java 21+, npm dependencies installed, and emulator ports 9099, 8080, 5001, and the hub port to be available. Terminal output will show expected `PERMISSION_DENIED` errors as tests deliberately exercise forbidden operations.

**Scope:** These are emulator integration tests, not penetration testing of a deployed production endpoint. They do not validate actual Google OAuth sign-in or IAM. Do not use these tests against a live Firebase project.
