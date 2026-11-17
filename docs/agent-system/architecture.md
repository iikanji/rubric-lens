# Agent-system architecture

## Goal
Coordinate engineering, verification, assessment research, usability, documentation, institutional readiness and user support without allowing any single automated process to redefine educational policy or silently release software.

## Logical components
- **Project owner / academic director (human):** final authority for educational choices, student-data handling, release risk acceptance and public research claims.
- **Orchestrator (task coordinator, not a privileged superuser):** divides tasks, collects specialist findings, resolves duplicate work, identifies conflicts and prepares decisions for the owner. It does not gain permissions merely because it coordinates.
- **Codex specialists:** software engineering, independent QA, security review, requirements analysis, repository documentation and support-related technical investigation.
- **Research and institutional specialists:** educational assessment/psychometrics, UX/accessibility, research/publication, and institutional adoption. Run on demand through approved research/document workflows; do not assume these are always-on services.
- **Continuous support processor (future service):** event-driven inbox and in-app submissions intake, sanitization, classification, deduplication and routing. The Codex support-investigation role is only one component of that service.
- **Critical reviewer (on demand):** challenges evidence, assumptions and proposed educational effects, without release authority.

## Authoritative records
The GitHub repository is the source of truth for **approved, versioned technical and agent-system documents**. Decision-making conversations and drafts can take place in ChatGPT or shared documents, but a requirement becomes authoritative in the repository only after reviewed publication or an explicitly recorded link to an approved controlled source.

Important distinction: a code branch reflects actual implementation, not necessarily approved educational policy. Source precedence for new work:
1. Explicit, current decision of the human project owner recorded in a reviewable change or decision log.
2. Latest approved requirement/specification for that domain.
3. Verified code, configuration and tests for claims about current behavior.
4. Clearly labeled draft proposals and research hypotheses.

If (1)-(3) disagree, stop the disputed implementation and surface the discrepancy; do not automatically elevate the current code or an older document.

## Task lifecycle
Intake → sanitize and classify → create/find durable work item → investigate in bounded scope → route to specialist → produce evidence → independent QA/security review as relevant → human approval at gates → merge/release by authorized workflow → confirm resolution → update knowledge base → notify requester under approved messaging policy.

Issues and pull requests carry status and evidence. Chat transcripts are not the only permanent record. No autonomous background processes are activated by these documents.

## Infrastructure topology — target
- GitHub: source, versioned docs, issues, pull requests, CI, protected branches.
- Codex: short-lived coding or review agents in isolated worktrees/branches.
- ChatGPT Work or equivalent: bounded research and document workflows.
- Private mailbox/ticket service: original support correspondence, contact data and delivery status.
- Private event-driven worker: inbox webhook/polling, idempotency keys, queue, retries, dead-letter queue, logs and notifications.
- Observability service: sanitized application telemetry and alerts, subject to separate approval and privacy review.
- Managed secrets and least-privilege identities: never in the repository.

No mailbox provider, secrets manager, automation host, SLA or production deployment has been selected or connected by this architecture document.

## Separation of duties
Engineering proposes code; QA independently tests; Security evaluates trust-boundary changes; Assessment Research evaluates methodology; the project owner approves policy and high-impact releases. Orchestration records disagreements rather than converting them into silent majority votes.

## Current technical baseline and limits
The pilot is built with Next.js/React/TypeScript, Firebase Auth, Firestore, and callable Cloud Functions. Existing tests exercise selected authorization and allocation scenarios using emulators. Reflection I, feedback-release gating and Reflection II are not verified in the referenced pilot baseline. Institutional production readiness and independent security certification are not established. Review against the latest repository version before reusing these historical statements.
