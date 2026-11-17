# Collaboration and handoff protocol

## Durable task record
Each cross-agent task should have an issue or reviewable record with these fields:
- **Ticket ID and origin:** manually entered, sanitized support report, review finding, test alert or approved feature request.
- **Problem and evidence:** expected versus observed behavior, source version/commit, and non-identifying reproduction steps.
- **Classification:** bug, regression, support, feature, security, research, UX, documentation or operations.
- **Priority and scope:** user impact, severity rationale, environments affected and unverified assumptions.
- **Owner and reviewers:** one integration owner; independent QA and Security reviewers where appropriate.
- **Acceptance criteria:** explicit result and tests required to close.
- **Data handling:** classification and redaction check, no names/contact details/raw student records.
- **Status and links:** PR, test result, approval, release/knowledge-base entry, and customer follow-up status.

No issue title or body should include student names, raw email addresses, secret values, private support correspondence, security exploit details that require confidential handling, or directly identifying assessment records.

## Suggested GitHub labels
Type: bug, feature-request, support-investigation, security-review, documentation, research, ux.
Status: needs-triage, needs-reproduction, ready-for-engineering, needs-qa, blocked, needs-owner-decision.
Risk: risk-low, risk-medium, risk-high.
These are conventions for future configuration, not assertions that labels have been created.

## Task flow
1. **Intake:** validate and sanitize; link duplicates without exposing their private original sources.
2. **Triage:** determine whether there is a documented answer, a reproducible defect, an enhancement or a possible security incident.
3. **Assignment:** orchestrator chooses bounded independent workstreams and identifies one integration owner.
4. **Investigation:** agents examine the relevant checked-in code/docs and produce evidence. Preserve disagreement explicitly.
5. **Proposed fix:** engineering creates isolated branch and draft PR; assessment/UX/design changes require appropriate specialist and owner sign-off.
6. **Review:** QA tests the exact change; Security reviews privacy, authorization, feedback-release and records changes.
7. **Approval:** a human with appropriate authority accepts policy changes, merges and production deployments under approved release rules.
8. **Closeout:** verify in the actual target environment before saying fixed; update issue, release notes and support knowledge base; notify requester only under approved communications policy.

## Pull-request checklist
- [ ] Issue / approved requirement linked.
- [ ] Scope, exact behavior changed and non-goals explained.
- [ ] Source and commit/version identified.
- [ ] New tests and regression cases included where appropriate.
- [ ] Auth/Firestore/Functions and reflection/feedback boundaries reviewed when affected.
- [ ] No private learner records, raw support contents, secrets or logs committed.
- [ ] Tests actually run listed with failures and limitations.
- [ ] Independent review and human approvals recorded at applicable gates.
- [ ] Rollback/recovery plan and monitoring impact considered for a release.
- [ ] Documentation and customer-facing messaging updated if behavior changed.

## Conflict handling
Do not resolve disagreements by silent majority rule. When Engineering, Security, Assessment Research or UX disagree, capture: each position, evidence, affected requirement, risk, and recommended decision. The owner resolves product or risk-policy disputes; verified code/test behavior remains independently reportable.

## Concurrency
Separate agents may review in parallel. Only one integration owner should write a shared file at a time. Worktrees are preferable for independent code edits. Never let a support-triggered automation directly edit a currently reviewed branch.

## Evidence language
Use precise status labels:
- **Implemented:** code or configuration exists in identified revision.
- **Tested:** a specified test actually ran with recorded outcome.
- **Reported:** user or operator said it occurred; not independently established.
- **Proposed:** not implemented/verified.
- **Approved:** explicit decision by authorized owner.
- **Released:** deployment confirmed to target environment, not merely PR merged.
