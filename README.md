# Thoughtful Systems Plugins

Official marketplace packages for [Thoughtful Systems](https://thoughtful.systems).

This repository is the public distribution boundary for agent-facing plugin
metadata, skills, MCP connection manifests, documentation, and brand assets.
It intentionally contains no Vibe service implementation, deployment
configuration, credentials, or customer data.

## Plugins

| Plugin | Description | Package |
| --- | --- | --- |
| [Vibe](./vibe/) | Build and run governed team tools through one OAuth-protected MCP connection. | `vibe@thoughtful-systems` |

## Install from this marketplace

After this repository is public, add it as a marketplace and install Vibe.

### Claude Code

```sh
claude plugin marketplace add thoughtful-systems/plugins
claude plugin install vibe@thoughtful-systems
```

### Codex

```sh
codex plugin marketplace add thoughtful-systems/plugins
codex plugin add vibe@thoughtful-systems
```

ChatGPT and Claude directory listings use the same package and remote MCP
endpoint after their respective reviews.

## Validate

[Bun](https://bun.sh/) is the only repository prerequisite.

```sh
bun install --frozen-lockfile
bun run validate
bun run test:install
```

`validate` checks synchronized manifests, public-package safety invariants,
and Claude's strict validator. `test:install` installs the local marketplace
into isolated Codex and Claude configuration directories.

The optional `bun run eval:skill` suite compares Vibe behavior with and without
the skill using a selected model and deterministic mock tools. It requires a
configured Pi model provider and does not run in CI.

See [`vibe/PUBLISHING.md`](./vibe/PUBLISHING.md) for the remaining directory
submission gates.
