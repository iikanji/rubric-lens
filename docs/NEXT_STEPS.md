# Development continuation (for Codex)

Start on branch `codex/pilot-foundation`. Do not merge into main until CI passes and the teacher confirms readiness.

## Verify the foundation
- Run `npm install`, `npm --prefix functions install`, `npm run typecheck`, `npm --prefix functions run build`, `npm --prefix functions test`, `npm run test:rules`, and `npm run build`.
- Fix all compiler / test failures. The initial code has been authored through GitHub API and has **not yet** been installed or built locally.
- Add callable Functions tests for auth and role, roster claiming and revocation, assessment-window race, and cross-class access.
- Strengthen assignment balancing for small classes and mixed individual/group targets.
- Review the entire Firestore document permission surface with negative-case emulator tests.
- Confirm that school email addresses never appear in public UI or repository fixtures.

## Then implement the smallest complete learning cycle
1. Reflection I per presenter with opening and deadline, enforced server-side feedback gate.
2. Teacher finalization snapshot: peer mean / distribution, expert result side by side, raw rating preservation.
3. Teacher-approved selective feedback release (not automatic); individual presenter can only read authorized own or group-level fields.
4. Reflection II after release with earlier Reflection I visible and versioning.
5. Criterion-scoped rater calibration with peer and expert comparison, separately released.
6. Rehearse with two projects, two rubrics, multiple class rosters, and at least three distinct Google accounts.

Full lifecycle design from the Rubric Lens conversation remains binding; advanced variations may be deferred for the November pilot only after explicit user agreement.
