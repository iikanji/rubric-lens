# Rubric Lens

A distributed criterion-based assessment and reflection platform for classroom presentations.

## Current status — pilot foundation (not deployed)

The `codex/pilot-foundation` branch includes a Next.js App Router / React / TypeScript frontend, Google Sign-In using Firebase Auth, Cloud Firestore rules, callable Firebase Cloud Functions, a teacher workspace, and a student rater interface.

**Implemented in this foundation:**
- Teacher allowlist-based role bootstrap
- Isolated class creation and optional rubric reuse across classes
- CSV roster invitation import and verified Google account matching
- 0–3 rubric editor with individual/group criteria and student/expert eligibility
- Session and presentation creation
- Deterministic, approximately balanced, fixed student criterion assignments
- Live assessment window open/close
- Student score and comment entry, autosaved drafts, submitted revisions
- Teacher-only peer averages/distributions and separate expert ratings
- Server-validated membership/window enforcement and Firestore rules tests

**Not implemented yet:** Reflection I / II, feedback release, student calibration feedback, advanced scoring, rotating assignments, complete reassignment and pause/restart controls, formal score finalization/versioning, LMS connectors, production deployment. Do not use with real students before security verification and classroom rehearsal.

## Getting started

1. Install Node.js 22 and the Firebase CLI.
2. In the repository root, run `npm install` and `npm --prefix functions install`.
3. Use the existing Firebase project `rubric-lens-027`; enable Google Authentication, Firestore, and Cloud Functions. Project number: `574540236485`. Do not create a second project.
4. Copy `.env.local.example` to `.env.local`; project ID, Auth domain, and messaging sender ID are prefilled. Copy **only** the Web App API key and App ID from Firebase Console → Project settings → Your apps. Do not commit `.env.local`.
5. Copy `functions/.env.example` to `functions/.env.rubric-lens-027`; put the teacher's verified Google address into `TEACHER_EMAILS`. Keep that file out of Git. Optionally configure `STUDENT_EMAIL_DOMAIN`.
6. Run the emulators with `npx firebase-tools emulators:start --only auth,firestore,functions` (set `NEXT_PUBLIC_USE_EMULATORS=true` in the Next.js env).
7. Start Next.js with `npm run dev`.
8. Before using a real school roster, run all checks and verify at least two distinct synthetic student accounts.

## Verify

```bash
npm run typecheck
npm --prefix functions run build
npm --prefix functions test
npm run test:rules
npm run build
```

See [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for schema, permission boundaries, known constraints, deployment steps and scope.

## Pilot policies

- One teacher initially; classes and assessment projects remain isolated.
- Both pilot rubrics use four descriptor levels (0–3), while stored scales remain explicit and configurable for future versions.
- Presenter self-rating is excluded from peer assignments.
- Peer mean and expert result remain separate; no arbitrary combined official grade.
- Student access is tied to verified roster membership, not merely successful Google Sign-In.
- Feedback and reflections require a later release gate before classroom use.

## AI agent-system documentation (proposed)

The [agent-system documentation](docs/agent-system/README.md) defines specialist responsibilities, governance, support automation design, and review/approval workflows. [AGENTS.md](AGENTS.md) holds repository-wide AI coding instructions; [.codex/config.toml](.codex/config.toml) registers proposed Codex specialist roles. These files do not start a persistent support agent, authorize access to student data, or enable automatic releases.
