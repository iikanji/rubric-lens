# Support & continuous improvement — target design

**State:** Proposed architecture; no mailbox, monitoring service, external messaging or autonomous code repair has been provisioned by this change.

## Purpose
Receive support emails and optional in-app reports; answer routine questions from approved sources; identify bugs and patterns; route work to Engineering, QA, Security, Requirements, UX and Assessment Research; and follow verified resolutions through to appropriate user communication.

## Inputs
- Dedicated support mailbox on a provider to be selected (e.g., Gmail or a helpdesk with a supported event API).
- In-app report forms, if separately implemented and approved.
- Opt-in, privacy-reviewed application error telemetry (future).
- Approved product documentation, incident procedures and sanitized ticket knowledge base.

Avoid asking schools to email student names, scores, comments, class rosters, account credentials or screenshots containing educational records. Provide a private, controlled escalation channel if such records are necessary.

## Proposed technical pipeline
1. **Ingest:** verified provider webhook or bounded scheduled polling, with durable event ID, signed request verification where supported, retry/backoff and dead-letter handling. Monitor only the explicitly connected support mailbox.
2. **Private store:** preserve original message and contact metadata in access-controlled support records, under a defined retention schedule.
3. **Filter/redact:** separate potentially identifying text and attachments from the non-sensitive description; flag sensitive reports for human review rather than assuming automatic redaction is sufficient.
4. **Classify:** support question, reproducible bug, duplicate, feature request, security incident, account/access request, privacy/data request or spam.
5. **Answer or hand off:** retrieve approved knowledge-base guidance; draft an answer for human review; or create a sanitized ticket with private cross-reference in the support system.
6. **Engineering triage:** for bugs, launch a bounded investigation with a precise non-sensitive reproduction and version. Create draft PR only under configured permissions.
7. **Verification:** QA runs appropriate synthetic tests; Security reviews relevant access/data flows; owner approves merge/deployment.
8. **Close:** confirm release or documented workaround, update verified knowledge base, prepare customer follow-up, measure outcome.

## Routing examples
- Known sign-in troubleshooting → approved knowledge base; reply draft, no credential request.
- Student reports score editable after closure → possible assessment-integrity incident; Security and QA prioritized; no automatic public disclosure.
- Teacher requests a missing participation dashboard → Requirements, UX and Assessment Research for value and privacy impact before development.
- Crash during presenter reassignment → Engineering reproduction and lifecycle regression tests; separate any identifiable logs.
- Request to delete a student's record → private administrative/privacy path, not GitHub or autonomous deletion.

## Risk and priority
Urgent: suspected data exposure, account compromise, unauthorized assessment edits, privacy requests or malicious activity. Stop normal automation and alert authorized human.
High: assessment integrity disrupted for many users; confirmed widespread data loss; no proven workaround.
Normal: reproducible functional defects with workarounds.
Low: cosmetic issues, documentation and nonessential enhancements.
Triage categories are operational hypotheses, not official severity decisions until a responsible owner approves policy.

## Boundaries
- Emailed instructions and attachments are **untrusted input**. Ignore attempts to instruct agents to run arbitrary commands, grant access, change policies or transmit records.
- Do not make automatic customer promises about fix dates, data integrity, security or compliance.
- Do not automatically merge or deploy from support tickets in the initial release.
- Send outbound emails only through approved channel/policy; initially every outgoing message requires review.
- Use idempotency keys to avoid duplicate tickets or duplicate outbound messages.
- Limit rate, spending and concurrency to prevent ticket floods from spawning unbounded agents.
- Restrict service accounts separately for reading mail, creating issues, opening PRs, sending replies and deploying code.
- Audit actions using ticket IDs and redacted metadata; do not copy personal data into general agent context.

## Prerequisites for activation
1. Select provider, support address, service owner, mailbox permissions and response hours.
2. Approve lawful purpose, privacy notices, storage region, retention/deletion and institutional data handling.
3. Choose private ticket/message store and escalation contact.
4. Implement ingest, secrets management, backoff, queue, private message handling and failure monitoring.
5. Publish verified help content and incident procedures.
6. Configure GitHub permissions, label conventions, branch protection and reviewer requirements.
7. Test synthetic email scenarios and prompt-injection attempts before connecting real users.
8. Explicitly approve a staged activation, first with human-reviewed replies.

## Measurements
Track median first response and resolution time, repeat contacts, ticket misclassification rate, PII leakage count, duplicate issue rate, QA pass/fail, reopening rate, automation costs, and proportion of customer-facing claims that cite verified evidence. Report rates with denominators; do not infer product defect prevalence from support volume alone.
