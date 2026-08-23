# Author Vibe tool modules

Read this together with the live `create_tool` or `update_tool` builder type.
The catalog controls the action wrapper; this reference controls the module
shape and engineering choices.

## Module contract

A tool is one complete ESM JavaScript module with one default export:

```js
export default {
  name: "create_incident",
  description: "Create an incident in shared app storage",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", minLength: 1, maxLength: 200 },
      severity: { enum: ["low", "medium", "high"] },
    },
    required: ["title", "severity"],
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: false,
  },
  capabilities: {},
  handler: async (input, ctx) => {
    const id = crypto.randomUUID();
    await ctx.storage.put(`incident:${id}`, { id, ...input });
    return { id };
  },
};
```

Use [`../assets/tool-template.js`](../assets/tool-template.js) as a copyable
starting point.

## Retrieve the live authoring contract first

After selecting build mode, call `vibe_catalog({ action: "authoring" })` before
writing source. It returns the deployed runtime fingerprint and limits, module
shape, exact context signatures/returns/limits under `contextApi`, recommended
policy under `recommendedAuthoringPolicy`, the dependency catalog, and
executable recipes. The advertised catalog schema is stable across modes;
`BUILD_MODE_REQUIRED` means switch modes and retry, not rediscover a different
schema. Its stable JSON error envelope is also present in textual content for
adapters that discard error `structuredContent`. Add `app` and optionally
`tool` for compact state containing the global runtime fingerprint plus current
migrations, schedules, draft/published schemas, capabilities, dependency
locks, hashes, and runtime pins; it deliberately does not repeat the complete
API, dependency, policy, or recipe contract.

For an existing tool, call `get_tool_source` and paginate only with its
`nextOffset`. This returns exact immutable original source and hash to managers;
it does not expose generated bundles or storage keys. Without `version`, it
returns the one current draft, or the published version when no draft exists.
Durable constraints enforce at most one draft and one published version;
updating supersedes the prior unpublished draft. Never reconstruct a version
from catalog summaries.

Run complete proposed source through `validate_tool` before create/update. The
operation shares the real dependency, bundle, module, schema, capability, and
runtime preparation path but returns `persisted: false`, does not execute the
handler, and writes no version/source/workspace/run state. It records one
bounded content-addressed readiness receipt. Treat advisories as quality
guidance and errors as blockers. `ok: true` means preparation succeeded, not
that an unsaved proposal is ready: inspect `qualityGate`,
`publicationReadiness`, and `nextSteps`. The same evaluator reads real evidence
when source matches a saved draft, so a fully exercised draft reports `ready`.
Create and update receipts repeat those fields; do not discard them after
saving.

The unscoped authoring response also includes `qualityHelpers`. Each helper
maps stable AST diagnostic codes to a short repair pattern and, where useful,
an executable `list_templates` recipe. `validate_tool` reports one-based source
locations for parsed source hazards. Repair blocking diagnostics such as
floating `ctx` promises, ambient `fetch`, mutable module state, test-only
branches, insecure randomness, and non-atomic related SQL writes before saving
a draft. Console logging and prefix-free KV enumeration remain explicit
reviewable warnings.

Treat `recommendedAuthoringPolicy.version` and `sourceAnalyzer` as the quality
policy identity. Load unscoped authoring context at the start of each build
session even when the execution runtime fingerprint has not changed.

On failure, use `structuredContent.error.code`, `phase`, `path`, `expected`,
`actual`, `retryable`, and `remediation`, or parse the identical JSON text
fallback; do not scrape prose or stack traces. Validate again after a focused
repair. `retryable` never grants permission to repeat a potentially external
write.

## Contract rules

- `name` starts with a lowercase letter and uses lowercase letters, digits,
  and underscores.
- Describe the operation and material side effects, not implementation trivia.
- Use narrow JSON Schemas. Reject unexpected fields when appropriate.
- Declare `outputSchema` for structured, typed composition. Successful output
  is runtime-validated before being returned.
- Return bounded JSON-serializable data. Do not return credentials, unbounded
  provider payloads, or internal platform objects.
- Keep source within the limit reported by the live builder schema.
- Never accept a caller role, user ID, organization ID, or team assertion in
  tool input when trusted `ctx.caller` contains that identity.

## Runtime context

Use only documented brokered APIs:

- `ctx.storage` — app-scoped KV/SQLite operations. Use `compareAndSet` with a
  bounded retry loop for concurrency-safe read/modify/write state. `delete`
  returns a boolean. `list` is not runtime-capped, so use a narrow prefix and
  keep KV cardinality bounded as policy. When the live authoring contract
  advertises `sqlBatch`, use it for related SQL statements that must commit or
  roll back together and follow the exact live batch, query, and parameter
  limits.
- `ctx.files` — app-scoped persistent files: 5 MiB per object, 512-character
  relative keys, and at most 100 metadata-bearing list results.
- `ctx.fetch` — public HTTPS to exact hosts declared by this immutable
  version.
- `ctx.secrets` — only declared app secret names that are currently present.
- `ctx.jobs` — version-pinned same-app background work.
- `ctx.approvals` — human-gated child runs.
- `ctx.invoke` — another published tool in the same app, with cycle/depth
  controls.
- `ctx.tasks.assign` — attributed human task assignment when every version in
  the call lineage declares `tasks: ["assign"]`.
- `ctx.tasks.inform` — surfaces information without a task lifecycle when every
  version in the call lineage declares `tasks: ["inform"]`.
- `ctx.caller`, `ctx.run`, and `ctx.trigger` — trusted identity and execution
  metadata.

Generated modules have no ambient D1, R2, Queue, service binding, provider
credential, package manager, or unrestricted network access.

## Capabilities

Declare only authority the handler actually uses:

```js
capabilities: {
  secrets: ["INCIDENT_API_KEY"],
  http: { hosts: ["api.example.com"] },
  tasks: ["assign", "inform"],
}
```

Hostnames are exact; one host does not authorize arbitrary subdomains.
Use stable business idempotency keys for external writes, jobs, approvals, and
task assignment.

Inbox deliveries provide exactly one `to` user email or `teamId`. Optional
structured payloads use `{ schema, version, data }`; the first two identify a
contract while `data` remains untrusted. Capability additions belong to
immutable versions and must be surfaced before publication or rollback
confirmation.

## Storage and migrations

All tools in one app share storage and files. Other apps are isolated.

- Prefix keys and records by domain, such as `incident:`.
- Treat `$vibe$` KV keys and `_vibe_` SQL tables as reserved.
- Put schema evolution in ordered immutable migrations discovered through the
  live `add_migration` action.
- Do not run ad hoc schema setup on every handler invocation.
- Use parameterized SQL and bounded queries.
- Never store secrets or provider credentials in storage or files.

## Dependencies

There is no runtime npm installation or registry resolution.

1. Discover `list_dependencies` through the live builder catalog.
2. Select only an approved package and exact version.
3. Declare it in the version's dependency input and use a static import.
4. Surface name, version, license, and purpose before dependency confirmation.

The trusted authoring plane verifies and bundles approved packages into a
self-contained immutable artifact. Package code grants no platform authority.
Dynamic imports, version ranges, undeclared imports, native binaries,
transitive installs, lifecycle scripts, and runtime registry access are not
supported.

Versioned platform modules may also be available at documented paths such as
`./vendor/vibe-csv-v1.js` and `./vendor/vibe-workflow-v1.js`. The versioned path
is part of the immutable dependency contract.

## Test checklist

Before proposing publication, test relevant cases:

1. representative success;
2. invalid, missing, empty, and oversized inputs;
3. repeated input and idempotent retries;
4. concurrent updates or stale compare-and-set values;
5. empty lists and not-found records;
6. partial external-service failures;
7. output-schema violations;
8. multi-tool shared-data behavior;
9. least-privilege capability denial;
10. clean draft state with `reset: true` when isolation matters.

Report which effects were simulated, blocked, or executed for real. A passing
draft test is evidence, not permission to publish. Preserve the structured
receipt's run ID, immutable tool version, draft workspace, status, runtime
fingerprint, and result. Preserve each ordered step receipt from
`simulate_workflow` for multi-tool evidence and `get_run` correlation. On
failure, preserve the accumulated transcript, failed step, and
`partialEffects`; reset or verify/idempotently resume rather than assuming
prior mutations rolled back.

Later workflow inputs may consume prior results with
`{ "$fromStep": { "step": 1, "pointer": "/id" } }`. References are limited to
earlier completed steps and bounded RFC 6901 pointers. Before publication,
collect matching validation evidence, two distinct successful `test_tool`
inputs, and one successful workflow simulation. Every input must satisfy the
immutable input schema; `TOOL_INPUT_INVALID` attempts do not count toward
either evidence requirement. Repair insecure randomness and
non-atomic multi-write SQL advisories using APIs advertised by the live
contract; they cannot be overridden.
