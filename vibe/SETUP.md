---
name: setup-vibe
description: Connect and verify the OAuth-protected Vibe MCP server after installing the Vibe plugin. Use when Vibe is newly installed, disconnected, unauthenticated, or missing expected tools.
---

# Set up Vibe

Read [`skills/vibe/references/setup.md`](./skills/vibe/references/setup.md) and
follow its connection and verification workflow.

Use the bundled `vibe` MCP server. Let the client discover OAuth and open the
browser sign-in flow; never ask the user to paste a token, cookie, client
secret, or authorization header into chat or plugin configuration.

Setup is complete only when an authenticated tool refresh exposes
`toggle_build_mode`, `vibe_catalog`, `vibe_use`, `vibe_tasks`, and
`vibe_inbox`.
