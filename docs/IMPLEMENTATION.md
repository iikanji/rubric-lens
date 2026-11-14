# Rubric Lens pilot — implementation contract

Target: a single-teacher classroom trial with two distinct project rubrics, reusable across multiple classes. Next.js App Router + Firebase Authentication (Google), Firestore, Cloud Functions, Firebase App Hosting. All personal roster information stays out of the Git repository.

## Trust boundaries

- Access to the teacher role is restricted by `TEACHER_EMAILS` in the deployed Functions environment. After signing in, `bootstrapTeacher` sets a Firebase custom claim; sign out/in or token refresh to activate Firestore read permissions.
- Students must sign in with a verified Google account **and** claim a pre-imported roster invitation. Merely knowing a class code grants no access.
- `classes/{classId}` belongs to one teacher. The teacher creates the rubric and assessment sessions. Students have no direct Firestore writes.
- `users/{uid}/assignments` is a student-only projection of assigned criteria; sensitive class and student submission data remain inaccessible through direct Firestore reads.
- All mutating calls validate authentication, class ownership or active membership and submission windows on the server.
- Keep the school roster private. Do not add real names or addresses to demo scripts.

## Collections (pilot subset)

- `classes/{classId}`: ownerUid, name, projectName, rubricId.
- `classes/{classId}/invites/{sha256(normalizedEmail)}`: teacher-only roster entry, optional claimedUid.
- `emailInvites/{emailHash}/classes/{classId}`: server-only enrollment index.
- `classes/{classId}/members/{uid}`: active authenticated member.
- `rubrics/{rubricId}`: ownerUid, criteria, scale (pilot 0–3).
- `classes/{classId}/sessions/{sessionId}`: presentation event and rubric snapshot pointer.
- `.../presentations/{presentationId}`: individual or group target, window state.
- `.../assignments/{assignmentId}`: one rater, one criterion, one target.
- `.../ratings/{assignmentId}`: draft or submitted score and comment.
- `.../expertRatings/{criterionId}_{targetUid}`: pilot teacher's expert score.
- `users/{uid}/classes/{classId}` and `users/{uid}/assignments/{assignmentId}`: user-scoped projections.

## Pilot operational constraints

- Rosters: additive import; normalize/deduplicate emails. Server-side `revokeStudent` is available; the teacher-facing revocation UI is not yet implemented. Do not reuse an email for another person's account. Review roster entries before using real student data.
- Assignments: fixed criterion per student per session; presenter self-ratings excluded; if there are not enough eligible raters, show uncovered targets. Rotation and advanced minimum coverage are later configurations.
- Ratings: autosaved by explicit save action on pilot UI; incomplete work remains a draft until submitted. A closed window does not silently submit.
- Scores: display student mean and teacher-expert result independently, never apply an unexplained combined weight.
- Pending modules: Reflection I/II, gated feedback and rater calibration. No student feedback should be published before those access controls are implemented.
- Some features of the full lifecycle are deliberately not in this foundation; see the fast-track brief before declaring the pilot ready.

## Set up and run

1. Create a dedicated Firebase project (Firestore, Authentication, Functions enabled). Enable the Google provider in Authentication and authorize your application domain.
2. Run `npm install` and `npm --prefix functions install`.
3. Copy `.env.local.example` to `.env.local`, and provide the Firebase web app configuration (public identifiers, not secret service-account credentials).
4. Configure `functions/.env.<project-id>` using `functions/.env.example` and add the teacher's verified email to `TEACHER_EMAILS`. Do **not** commit that file.
5. Select your Firebase project with `firebase use --add`, then deploy Functions and Firestore rules. Never use an uncontrolled production project for test data.
6. Run `npm run dev`. For emulators, set `NEXT_PUBLIC_USE_EMULATORS=true`, start `firebase emulators:start --only auth,firestore,functions`, and run the app locally.
7. Test across two distinct student identities before importing real rosters.

## Tests and limitations

- `npm --prefix functions test`: allocation logic tests.
- `npm run typecheck`: Next.js/TypeScript checks.
- `npm run test:rules`: Firestore security rules in emulator.
- `npm run build`: production Next.js build.
- Cloud Functions require Blaze billing when deployed; verify account settings and regional configuration.
- **This is not yet deployed or classroom-approved.** Security tests and a manual multiple-account rehearsal are mandatory.
