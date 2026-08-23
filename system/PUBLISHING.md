# Thoughtful Systems Marketplace Publishing

Thoughtful Systems ships one canonical Agent Skill and one OAuth-protected Streamable HTTP
MCP endpoint. Platform manifests package those same assets rather than forking
the workflow guidance.

## Distribution targets

| Target | Package entry point | Submission unit |
| --- | --- | --- |
| ChatGPT and Codex Plugin Directory | `.codex-plugin/plugin.json` | Skill plus remote MCP app |
| Claude Plugin Directory | `.claude-plugin/plugin.json` | Skill plus remote MCP connector |
| Claude Connectors Directory | `https://thoughtful.systems/mcp` | Remote MCP server |
| Portable Agent Plugins clients | `plugin.json` and `mcp.json` | Portable plugin package |

The repository-level catalogs are for local, Git, and organization marketplace
testing:

- `.agents/plugins/marketplace.json` — OpenAI/Codex marketplace;
- `.claude-plugin/marketplace.json` — Claude marketplace.

## Automated validation

From the repository root:

```sh
bun run validate
```

Test OpenAI marketplace discovery without changing the user's Codex state:

```sh
codex_home="$(mktemp -d)"
CODEX_HOME="$codex_home" codex plugin marketplace add "$PWD" --json
CODEX_HOME="$codex_home" codex plugin list --available --json
rm -rf "$codex_home"
```

Also run the Thoughtful Systems MCP tests that assert every advertised tool has a title and
conservative `readOnlyHint`, `destructiveHint`, `idempotentHint`, and
`openWorldHint` annotations.

## Public-release gates

- [x] Extract the marketplace package into the dedicated
      `thoughtful-systems/plugins` repository without product implementation
      code, deployment configuration, credentials, or customer data.
- [ ] Make `thoughtful-systems/plugins` public before directory submission.
- [ ] Choose the public package license and add its SPDX identifier and license
      file to the extracted repository.
- [ ] Publish real HTTPS privacy-policy, terms-of-service, documentation, and
      support URLs, then add the legal URLs to the OpenAI native manifest.
- [ ] Decide whether the permanent marketplace MCP origin is
      `thoughtful.systems` or `thoughtful.systems` before review. Do not change a
      submitted endpoint without completing the canonical-origin migration.
- [ ] Provide a review account with representative sample data and no access
      to production customer data.
- [ ] Verify OAuth discovery, dynamic client registration, callback handling,
      refresh tokens, revocation, and disconnect/reconnect in both clients.
- [ ] Verify the anonymous MCP challenge and an authenticated `tools/list` on
      the exact production release being submitted.
- [ ] Exercise all three starter prompts in fresh ChatGPT and Claude sessions.
- [ ] Capture listing icon, copy, categories, support contact, and any required
      screenshots. Screenshots become mandatory if Thoughtful Systems adds MCP App UI.
- [ ] Review every write or destructive action and its confirmation behavior
      against each directory's current safety policy.

## Release discipline

Keep the version in the OpenAI manifest, Claude manifest, and both marketplace
entries synchronized. Bump it whenever skill instructions, connector metadata,
or bundled assets change. MCP server releases remain independently versioned;
confirm `/status` before publishing a plugin release against them.
