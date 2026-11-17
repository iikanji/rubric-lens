# Rubric Lens — multi-agent system documentation

**Status:** Initial version-controlled architecture and operating instructions, proposed for review. This directory is documentation, not a deployed orchestration service.

## Canonical locations
- Repository root AGENTS.md: shared instructions to coding agents working in this repository.
- .codex/config.toml and .codex/agents/: project-scoped Codex specialist role definitions, subject to the installed Codex client's support and trust settings.
- docs/agent-system/: architecture, charters, decisions, collaboration, support workflow, and evaluation procedures.
- GitHub Issues and pull requests: sanitized work tracking, review evidence, and development decisions once approved.
- Private support platform and controlled records store (not in this public repository): original messages, contact details, attachments, and incident records.

## Documentation index
1. [architecture.md](architecture.md) — technology boundaries, coordination and source-of-truth design.
2. [agent-charters.md](agent-charters.md) — nine specialist responsibilities plus orchestrator and independent critical review.
3. [governance.md](governance.md) — permissions, approval gates, data handling and release responsibilities.
4. [collaboration-protocol.md](collaboration-protocol.md) — issue/PR contracts, evidence and agent handoffs.
5. [support-automation.md](support-automation.md) — proposed continuous support, user suggestions and bug-to-PR pipeline.
6. [testing-and-evaluation.md](testing-and-evaluation.md) — staged rollout and acceptance exercises.
7. [decisions.md](decisions.md) — agreed structure, defaults proposed for review, and open decisions.

## What is and is not live
The checked-in role definitions can inform Codex sessions after the changes are merged into a working branch. This commit does not spawn persistent agents, install a mailbox listener, send customer emails, create live Firebase resources, activate deployment workflows, or authorize student-data processing.

## Reference implementation documents
- [Repository README](../../README.md)
- [Pilot implementation contract](../IMPLEMENTATION.md)
- [Local authorization tests](../AUTHORIZATION_TESTING.md)

Any future externally maintained educational or research specifications should be explicitly versioned, linked and reviewed before being treated as approved instructions. Avoid copying unpublished or personal source materials into this public repository without authorization.
