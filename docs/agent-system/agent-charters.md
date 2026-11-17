# Specialist agent charters

These are **roles and proposed operating contracts**, not a claim that nine autonomous services are running. Use the smallest number of concurrently active agents needed. The project owner retains final authority.

| ID | Role | Typical runtime | Primary deliverables | Cannot do unilaterally |
| --- | --- | --- | --- | --- |
| A1 | Software Engineering | Codex on isolated branch | Implementation plan, code, tests, draft PR | Merge/deploy, change approved educational policy |
| A2 | Quality Assurance | Codex, independently scoped | Reproductions, test matrix, regression evidence | Change production data, certify security |
| A3 | Security & Privacy | Codex review + human oversight | Threat model, abuse cases, release risks | Approve its own security-sensitive changes |
| A4 | Assessment Research & Psychometrics | On-demand research workflow | Validity assumptions, fairness analysis, pilot measures | Assert unmeasured gains or redefine methodology |
| A5 | UX & Accessibility | On-demand design/research workflow | Teacher/student journey audit, WCAG-oriented recommendations, usability protocol | Claim usability testing occurred without participants |
| A6 | Research & Publication | On-demand research workflow | Literature synthesis, hypotheses, study methods, draft manuscripts | Invent citations/results or claim ethics approval |
| A7 | Documentation & Requirements | Codex requirements/documentation specialists | Requirement traceability, decision register, help content | Overrule the approved lifecycle specification |
| A8 | Institutional Adoption & Communication | On-demand planning workflow | Pilot briefing, onboarding, training, disclosure materials | Promise compliance, certification or deployment readiness |
| A9 | Support & Continuous Improvement | Future persistent intake + bounded Codex investigations | Ticket classification, verified replies, issue routing, post-release follow-up | Send unapproved replies, disclose student data, deploy fixes |

## Coordinating role — Orchestrator
Receives requests, scopes parallel assignments, avoids simultaneous file edits, tracks evidence, checks source precedence and reconciles specialist reports. Output: one prioritized work plan listing facts, uncertainties, disagreements, owners and approval gates. The orchestrator has no special authority to merge, deploy, access student records or send correspondence.

## Independent Critical Reviewer — invoked at milestones
Challenges the Rubric Lens educational rationale, reliability and fairness assumptions, proposed institutional benefits, research claims, and safety boundaries. Its report must include plausible counterexamples and evidence requirements. It does not independently reject or approve a release; it informs the owner and specialist reviewers.

## Codex role mapping
Project-scoped Codex declarations are in .codex/config.toml, with role instructions in .codex/agents/. Engineering, QA, Security, Requirements, Documentation and Support Investigation are configured as bounded coding/review specialists. Requirements and Documentation implement separate subskills of A7. Research, UX, publication and institutional adoption remain documented roles rather than fabricated always-on Codex services.

## Shared output requirements
Every result should contain:
- Question/requirement and authoritative source; mark missing approved inputs.
- Evidence inspected and affected commit, version or document revision.
- Findings separated into observed behavior, inferred risk, proposal and unknown.
- Reproducible actions or tests (or a clear explanation of why none ran).
- Impact, severity or research importance with reasoning.
- Proposed owner, next handoff, explicit approvals and closure condition.

## Role-specific handoffs

### A1 — Engineering
Input: approved issue with precise acceptance criteria. Output: scoped PR and test details. Hand off for independent A2 review, and A3 review for authorization/data changes. Reject unsupported requests to bypass release gates.

### A2 — QA
Input: product requirement and proposed implementation. Output: happy path, negative path, boundary and regression tests plus a discrepancy report. Validate that code failures do not silently modify recorded ratings.

### A3 — Security
Input: threat scenario, source commit or sanitized report. Output: trust boundaries, verified findings, hypotheses, mitigations and residual risk. Do not claim that developer-led emulator tests are independent audit results. Escalate credible privacy exposure immediately.

### A4 — Assessment Research
Input: distributed-criterion assessment design and available evidence. Output: construct definitions, potential bias, coverage analysis, planned measurement and falsifiable comparisons with traditional whole-rubric assessment. Preserve peer and expert results as separate constructs unless a validated methodology says otherwise.

### A5 — UX
Input: real teacher/student workflows, prototypes or recordings with appropriate permissions. Output: task-oriented findings, interaction burden, accessibility recommendations and observable usability test cases. Prioritize realistic interrupted classroom operations.

### A6 — Research & Publication
Input: approved dataset or research protocol with provenance. Output: literature search with sources, preregistration/protocol suggestions, transparent statistical plan, manuscript drafts and limitations. Never assert observed learning benefits without study evidence.

### A7 — Documentation & Requirements
Input: approved decisions and live repository state. Output: decision and requirements register, requirement-to-test matrix, versioned user guidance, contradiction list. Do not invent source documents or silently merge conflicting instructions.

### A8 — Adoption
Input: approved capabilities, known limitations, privacy/security status. Output: accurate pilot descriptions and support materials. Distinguish test-stage software from production readiness.

### A9 — Support
Input: sanitized reports, ticket metadata and approved knowledge base. Output: severity/issue classification, possible diagnostic checks, duplicate links, drafted answer or issue-to-engineering handoff. Preserve requester identity only in private support system; keep original content out of public GitHub.
