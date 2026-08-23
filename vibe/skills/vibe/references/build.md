# Build and manage Vibe apps

## Enter build mode and discover live APIs

Select build mode explicitly:

```json
{ "mode": "build" }
```

Then use `vibe_catalog` to inspect builder actions. It supports `list`,
`search`, `describe`, and `types`; in build mode, `tool` is a builder action
name such as `create_tool`:

```json
{ "action": "types", "tool": "create_app" }
```

Current action families include app/tool authoring, dependencies, draft
testing, releases, access, secrets, integrations, webhooks, migrations,
schedules, runs, enablement, and purge. Availability and exact inputs come
from the live catalog, not this reference.

Build-mode `vibe_use` exposes those methods under `vibe_builder`:

```js
async () => {
  const apps = await vibe_builder.list_apps({});
  const dependencies = await vibe_builder.list_dependencies({});
  return { apps, dependencies };
}
```

Each method accepts one object and returns `{ text, data? }`. Prefer `data` for
composition when present; it comes only from explicitly validated structured
content, never by guessing from text. Retain `text` for human-facing status.
Every call validates the current action schema and rechecks authorization.
List responses use named object fields (`data.apps`, `data.templates`) rather
than implicit top-level arrays. `list_runs` uses `data.runs`; `test_tool` and
`export_app` expose their receipt and export document directly as `data`, and
`list_webhooks` uses `data.webhooks`.

## Create a new capability

Follow this lifecycle:

1. **Clarify the contract.** Establish the operation, callers, inputs,
   structured outputs, durable data, expected failure behavior, and external
   effects.
2. **Inspect APIs.** Retrieve exact types for `create_app`, `create_tool`,
   `test_tool`, and any dependency, migration, release, or access actions the
   task needs.
3. **Create or inspect the app.** An app is the storage, file, secret,
   integration, sharing, and lifecycle boundary. Do not split one coherent
   shared data model across apps without a reason.
4. **Save a complete module.** Use the authoring reference and
   `assets/tool-template.js`. Declare narrow input/output schemas and minimum
   capabilities.
5. **Test the draft.** Exercise representative success, invalid, empty,
   repeated, concurrency, and partial-failure cases as relevant.
6. **Review evidence.** Show the user the behavior, schemas, requested
   capabilities, dependencies/licenses, migration impact, and draft results.
7. **Publish deliberately.** Publication moves the live pointer to an
   immutable version. Supply confirmation fields only after the user has
   approved the surfaced authority/dependency diff.
8. **Share narrowly.** Prefer `use` over `manage` and explicit tool allowlists
   when the user requests limited access. Audit with `list_access` after a
   change.
9. **Verify as a consumer.** Return to use mode, rediscover exact published
   types, invoke the tool, and inspect the run if behavior differs from the
   draft.

Updating a tool appends a draft version. It never edits a published version in
place. Durable constraints permit at most one current draft and one published
version per tool. Rollback selects another immutable version; review capability
and dependency changes before confirming it.

## Draft test boundaries

- Draft storage and files are isolated from published data but persist across
  tests in the same app so multi-tool workflows can be tested.
- Use `reset: true` when the test needs a clean draft workspace.
- HTTP calls are blocked, while jobs and approvals are
  simulated, unless a manager deliberately sets `allowSideEffects: true`.
- Task assignment is always simulated during draft tests.
- Never claim a simulated result proves a provider write occurred.
- Before enabling real draft effects, explain exactly which hosts,
  integrations, jobs, or approvals may be affected and get confirmation.

## Access and organization rules

- `use` permits invocation, optionally limited to named tools.
- `manage` includes all tools plus authoring, releases, access, secrets,
  integrations, automation, run controls, and deletion.
- Organization-wide use and unrestricted grants can expose future tools;
  explicit tool allowlists do not.
- Pending grants require a live organization invitation. They activate only
  after the invited person joins and connects.
- Do not infer organization membership from an email domain.

After every grant, revocation, or organization policy change, call
`list_access` and summarize the effective persisted policy.

## Secrets and integrations

- `set_secret` is write-only. Never repeat the value in source, a summary,
  task content, logs, or app storage. Tool versions receive only declared
  secret names.
- Connection URLs and one-time webhook secrets are sensitive. Show them only
  to the user who requested setup and do not retain them in agent memory.

## Automation and operations

Discover live types before configuring schedules, signed webhooks, jobs,
approvals, migrations, or runs.

- Treat a supplied run ID as the primary recovery target. Load `get_run` and
  inspect that exact run before searching related app records or considering a
  retry.
- Schedules and jobs pin exact published versions and input at admission.
- Migrations are immutable, ordered, and app-scoped.
- Retries retain the original version and input; they do not float to the
  newest release.
- Inspect a failed or ambiguous run before retrying side-effecting work.
- Disable a tool to stop new use without deleting its history or app data.
- Purge is permanent and requires exact app-name confirmation. Historical
  credential records must be cleared by an operator before affected apps can
  be purged.

## Finish in the user's intended mode

For ordinary end-user work, finish by selecting use mode and confirming the
published catalog. Leave build mode active only when the user is continuing an
authoring or management workflow.
