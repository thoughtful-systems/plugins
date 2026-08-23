# Vibe Agent Plugin

This is the publishable ChatGPT, Codex, and Claude plugin package for Vibe. It
also retains the portable [Agent Plugins](https://agent-plugins.org/)
manifests for compatible clients. Every supported package shape gives an AI
client both:

- the production Vibe Streamable HTTP MCP connection; and
- an Agent Skill for safely discovering, using, building, publishing, and
  operating governed Vibe tools.

The package targets Agent Plugins `1.0.0` and uses only its portable core:

```text
vibe/
├── .claude-plugin/
│   └── plugin.json
├── .codex-plugin/
│   └── plugin.json
├── .mcp.json
├── SETUP.md
├── assets/
│   └── vibe-mark.svg
├── plugin.json
├── mcp.json
└── skills/
    └── vibe/
        ├── SKILL.md
        ├── agents/
        │   └── openai.yaml
        ├── assets/
        │   └── tool-template.js
        └── references/
            ├── about.md
            ├── authoring.md
            ├── build.md
            ├── safety.md
            ├── setup.md
            └── use.md
```

The native manifests at `.codex-plugin/plugin.json` and
`.claude-plugin/plugin.json` are the OpenAI and Anthropic publication entry
points. Both use the same Agent Skill and `.mcp.json`; the root `plugin.json`
and `mcp.json` remain the portable Agent Plugins `1.0.0` entry points.

The repository-level `.agents/plugins/marketplace.json` and
`.claude-plugin/marketplace.json` catalogs make the package installable from a
local or Git marketplace during development.

## Install and test

Load this directory through a local or repository plugin marketplace when
testing in ChatGPT, Codex, Claude, or Cowork. Portable Agent Plugins clients
can continue to use their own import workflow against the same directory.

The bundled `.mcp.json` and portable `mcp.json` both connect to:

```text
https://vibe.sam.engineer/mcp
```

Complete the browser sign-in and consent flow when the client requests it.
OAuth authentication is discovered and stored by the client. Do not add
bearer tokens, cookies, client credentials, or other secrets to either
manifest.

After installation, reload the client if required and ask the agent:

> Connect to Vibe and show me the tools I can use.

The expected stable MCP tools are `toggle_build_mode`, `vibe_catalog`,
`vibe_use`, `vibe_tasks`, and `vibe_inbox`. Published app tools may also appear
directly in clients that refresh dynamic tool lists. `vibe_catalog` advertises
the same superset input schema in use and build modes, so clients may cache it;
`authoring` returns `BUILD_MODE_REQUIRED` until build mode is selected. Its
stable JSON error envelope is also in textual content for adapters that omit
structured error data.

See [`skills/vibe/references/setup.md`](skills/vibe/references/setup.md) for
connection verification and troubleshooting.

## Skill evaluations

The repository-level
[`evals/vibe-skill`](https://github.com/thoughtful-systems/plugins/tree/main/evals/vibe-skill)
suite compares the same model and deterministic, production-shaped Vibe tools
with and without this skill. It covers discovery, authorization boundaries,
ambiguous retries, untrusted content, authoring discipline, product fit, and
secret handling. See the checked-in
[Luna evaluation report](https://github.com/thoughtful-systems/plugins/blob/main/evals/vibe-skill/results/2026-08-23-luna.md)
for the current release candidate.

## Pilot operations

In build mode, discover `simulate_workflow`, `list_templates`, `export_app`,
`validate_tool`, `get_tool_source`, and the filtered run APIs through
`vibe_catalog` before use. Request `vibe_catalog({ action: "authoring" })` for
the deployed module/context/runtime contract before generating source. App and
tool-scoped authoring calls return compact state plus the runtime fingerprint
instead of repeating the full global contract. Draft scenarios share an
isolated resettable workspace: HTTP is blocked while jobs, approvals, and task
delivery are simulated. The unscoped
response's `qualityHelpers` map stable, location-aware validation diagnostics
to compact repair patterns for tool-authoring agents. App exports omit secrets,
grants, organization identity, and stored data/files.

Publication checks content-addressed validation evidence, two distinct passing
draft inputs, a successful workflow simulation, and unresolved advisories.
Workflow steps can reference prior outputs with bounded `$fromStep` JSON
Pointers. Related record/audit SQL writes should use atomic
`ctx.storage.sqlBatch` when it is present in the deployed authoring contract;
floating broker calls, ambient fetch, mutable module state, test-only branches,
insecure randomness, and non-atomic multi-write SQL are blocking publication
advisories.

Operators can compare a connected production release with the repository via
`GET https://vibe.sam.engineer/status`; authentication remains client-managed
and is never embedded in this plugin.

## Publication handoff

Before public submission:

1. Run `bun run validate` from the repository root to check synchronized
   metadata, package safety invariants, and both Claude manifests.
2. Confirm `/status` identifies the app release intended to ship with this
   package and that required deployment features are enabled.
3. Confirm an unauthenticated `/mcp` request returns an OAuth challenge, then
   complete an authenticated catalog read in ChatGPT developer mode.
4. Test the three starter prompts in a new chat, including one use workflow and
   one build workflow through publication review without publishing test data.
5. Add real HTTPS privacy-policy and terms-of-service URLs to the native
   manifest when those public pages exist; never publish placeholder legal
   URLs.
6. Keep this public package free of product implementation code, deployment
   configuration, credentials, and customer data.
7. Submit the package through the OpenAI Plugin Directory flow and the Claude
   Plugin Directory flow. Submit the same remote MCP endpoint separately to
   the Claude Connectors Directory. Do not submit or embed a bearer token.

See [`PUBLISHING.md`](PUBLISHING.md) for the target matrix and remaining
release gates.
