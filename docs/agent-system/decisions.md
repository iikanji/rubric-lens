# Agent-system decision log and open items

Date of initial documentation: 2026-11-17.

## Direction accepted in conversation
- Use the existing iikanji/rubric-lens GitHub repository for approved, versioned agent and technical documentation.
- Continue using ChatGPT for developing and reviewing plans, with GitHub PRs as formal change records.
- Keep original support emails, personal contact information, student data and private attachments in a restricted system, not in the public repository.
- Design specialized agents for coding and noncoding work, with a support/continuous-improvement role capable of eventually routing tickets to development.

## Review-branch implementation choice
- The present change is based on codex/pilot-foundation because that branch contains the working application and CI; default main currently contains only an initial README.
- Merge this review branch into the pilot branch after approval. Plan a deliberate integration of the pilot branch with main; do not silently assume that merging this PR publishes documents to main.
- These documents and Codex role definitions do not activate a support-monitoring service or make a production release.

## Proposed defaults — not separately authorized for deployment
- Controlled autonomy for sanitization, investigation, issue and draft-PR creation.
- Human-reviewed outbound support replies initially.
- Human review before any merge/deploy; stronger review for authorization, reflection/feedback, privacy and assessment methodology.
- Event-driven private intake service; GitHub Issues for sanitized tickets; separate private message/ticket storage.

## Open owner/operational decisions
1. Support email address, provider and delegated mailbox access.
2. Private helpdesk/ticket database and retention/deletion policy.
3. Responsible support, release, security/privacy and incident owners.
4. Scope of automatic outbound replies, allowed templates and response times.
5. Cloud hosting and event queue, budget/rate limit, telemetry and alerting.
6. Repository branch protection, approval requirements and CI-to-release credentials.
7. Approval and version-controlled publication of the full educational and session-lifecycle requirements.
8. Formal change approval and independent security assessment for institutional learner data.
9. Evaluation thresholds for routing accuracy, support quality and allowed automation failure rate.
10. Strategy for synchronizing the active pilot branch and the minimal default main branch.

## Do not misinterpret
A checked-in document can be a source of truth for approved policy, but does not grant technical permissions. An unreviewed proposal or a draft PR is not automatically an approved requirement or a live agent deployment.
