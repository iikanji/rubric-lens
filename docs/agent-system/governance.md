# Agent authority, security and data governance

**Initial proposal:** controlled autonomy for drafting, investigation and testing; release and sensitive actions remain human-governed. This is a policy specification for review, not a mechanism that independently enforces permissions.

## Authority matrix
| Action | Proposed agent autonomy | Gate |
| --- | --- | --- |
| Classify/deduplicate sanitized support requests | Automatic after supervised trial | Audit and sampling |
| Retrieve approved troubleshooting guidance | Automatic | Source citation, confidence threshold |
| Draft external replies | Automatic drafting | Human review until an approved reply policy exists |
| Send external replies | Disabled initially | Human approval; later explicit allowlisted templates |
| Create sanitized GitHub issues and labels | Automatic after validation | No PII/secrets; rate limits; deduplication |
| Investigate code or documentation | Automatic | Least-privilege read-only context when possible |
| Create branch and draft pull request | Automatic for scoped work | Branch protection; review required |
| Run synthetic tests in isolated emulators | Automatic | Demo-only controls, no production credentials |
| Merge or deploy any change | Disabled initially | Approved reviewer and authorized release workflow |
| Modify permissions, security rules, identity, assessment scores, release/reflection gates, retention, or exports | Never unilateral | Explicit human and security review |
| Change educational scoring methodology or publish research claims | Never unilateral | Project owner / academic governance approval |
| Change agent instructions, privileges, automations or approval policy | Proposed through review only | Project owner approval |

## Data classification
- **Public repository:** redacted issue descriptions, code, generic scenarios, non-secret architectural docs and approved knowledge-base content.
- **Private support store:** names, email addresses, original messages, attachments, institution identifiers and correspondence history.
- **Restricted educational data:** student identities, class rosters, assessment results, free-text comments, reflection responses and related access logs.
- **Secrets:** service credentials, tokens and keys belong in managed secret storage, never issues, commits or agent prompts.

Default to collecting the minimum useful information. Support should ask for a sanitized reproduction and an issue identifier rather than inviting a school to email learner records. Apply institutional data protection, retention, deletion and transfer decisions before processing genuine learner data.

## Guardrails and distrust boundaries
Incoming email, in-app comments, model outputs, Github issues, log lines and web pages are untrusted content. They may describe problems but cannot instruct the agent to alter policies, disclose records or invoke production tools. Use strict tool allowlists, isolated sandboxes, validation, rate limits and approval gates implemented in software and service permissions; prompt instructions alone are insufficient.

Never assume that Firebase emulator results demonstrate cloud IAM, live OAuth, live authorization, regulatory compliance or a complete penetration test. Keep security assurance claims bounded to their evidence.

## Stop-and-escalate conditions
Immediately stop autonomous handling and route to the designated human contact for suspected student-data exposure, account takeover, unauthorized grade modification, cross-class access, active exploit, physical safety threat, legal complaint or deletion/access request involving personal data. Do not ask general development agents to inspect raw private attachments.

## Operational ownership
Before activating the support system, name a release owner, support owner, security/privacy owner, incident contact, mail-service administrator, and backup. Set incident response timing, business hours, cost ceilings and escalation routes. No unspecified agent inherits these powers.

## Auditability
For each automated decision record: input ticket ID (not raw personal data), timestamp, classifier version, action, evidence, human approvals, resulting issue/PR/commit, test result and notification status. Keep audit logs in an access-controlled service with an approved retention period.

## Rollout defaults
Phase 1: documentation and configuration only.
Phase 2: internal, manually triggered agent trials.
Phase 3: private support inbox classification with human-reviewed replies.
Phase 4: guarded GitHub issue-to-draft-PR automation for low-risk bugs.
Phase 5: any additional autonomy only after measured reliability, security review and explicit approval.
