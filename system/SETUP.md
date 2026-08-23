---
name: setup-system
description: Connect and verify the OAuth-protected Thoughtful Systems MCP server after installing the Thoughtful Systems plugin. Use when Thoughtful Systems is newly installed, disconnected, unauthenticated, or missing expected tools.
---

# Set up Thoughtful Systems

Read [`skills/system/references/setup.md`](./skills/system/references/setup.md) and
follow its connection and verification workflow.

Use the bundled `system` MCP server. Let the client discover OAuth and open the
browser sign-in flow; never ask the user to paste a token, cookie, client
secret, or authorization header into chat or plugin configuration.

Setup is complete only when an authenticated tool refresh exposes
`toggle_build_mode`, `system_catalog`, `system_use`, `system_tasks`, and
`system_inbox`.
