# Understand Vibe and evaluate fit

## Mental model

Vibe is a governed platform for reusable, AI-accessible team capabilities. The
user keeps working in their AI client; Vibe supplies the durable control and
execution layer behind one OAuth-protected MCP connection.

An app is the main boundary. It groups tools, shared storage and files,
write-only secrets, managed integrations, access policy, immutable versions,
automation, and run history. Publishing a tool moves a pointer to an immutable
version; it does not deploy a new service.

At runtime, the platform authenticates the caller, checks current durable
authorization, pins an exact tool version and input, and runs the module in an
isolated Cloudflare Dynamic Worker. Generated code receives only declared,
brokered `ctx` capabilities. Catalog visibility and build mode are user
experience features, not authority.

## What Vibe can do

- Discover and invoke authorized, published company tools with live schemas.
- Create schema-described JavaScript tools and keep every saved version
  immutable.
- Validate and test drafts in isolated data before publication.
- Share apps with `use` or `manage` access, including narrow tool allowlists.
- Provide app-scoped KV/SQLite storage and persistent files.
- Provide declared app secrets without returning their values through MCP.
- Broker allowlisted public HTTPS, background jobs, approvals, same-app nested
  calls, and task or
  inbox delivery.
- Run published versions interactively, on schedules, or from signed webhooks.
- Record version-pinned runs for inspection, bounded retries, cancellation,
  rollback, and operational recovery.
- Compose several authorized tools in a disposable `vibe_use` sandbox.

## What Vibe cannot do

- It is not a general hosting platform for bespoke visual apps, real-time
  collaborative canvases, or arbitrary long-running services.
- Generated tool code has no ambient Cloudflare bindings, provider tokens,
  package manager, unrestricted network access, `fetch`, `eval`, or dynamic
  imports. It cannot cross app data, files, secrets, or authority.
- It cannot use an arbitrary npm package. Only exact, platform-approved
  dependencies can be bundled during trusted authoring.
- It cannot reveal app secret values. App secrets are write-only through MCP.
- It does not treat build mode, organization role, or a catalog listing as
  permission. Durable app policy is checked again on every call.
- It does not promise exactly-once external writes. Queue delivery and provider
  outcomes can be repeated or ambiguous, so tools need stable idempotency and
  cautious retry behavior.
- Draft simulation does not prove a real provider write occurred. External
  effects are blocked or simulated unless a manager explicitly enables a real
  draft integration test; task assignment remains simulated in drafts.
- It does not currently ship general declarative agents or durable dynamic
  workflows. Multi-tool composition and bounded draft workflow simulation are
  the implemented surface.

## Fit test

Prefer Vibe when the useful product can be expressed as governed operations an
AI client calls: internal operations, shared data utilities, automations,
knowledge workflows, or controlled integrations.

Recommend another architecture when the primary experience requires a bespoke
interactive UI, unrestricted code or networking, unsupported providers,
cross-app shared authority, hard real-time collaboration, or platform-level
infrastructure control.

When answering a fit question, state the desired outcome, map it to current
Vibe primitives, identify any missing primitive, and distinguish an
implemented capability from a roadmap idea. Confirm exact current schemas and
availability through the connected MCP catalog before proposing a build when
the recommendation depends on those live details. If a hard boundary above
already rules the use case out, do not probe unrelated organization tools just
to confirm the boundary. When deployment feature state matters, inspect the
public `/status` response too; do not promise an implemented capability that
the connected deployment has disabled.
