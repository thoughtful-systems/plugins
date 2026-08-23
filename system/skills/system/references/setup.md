# Set up and verify Thoughtful Systems

## Connection

The plugin declares one Streamable HTTP MCP server named `system`:

```text
https://thoughtful.systems/mcp
```

The native ChatGPT/Codex and Claude manifests both reference `.mcp.json`.
Portable Agent Plugins clients use `mcp.json`. None of these files carries a
credential: the client owns OAuth discovery, browser authorization, refresh,
and secure token storage.

## Setup procedure

1. Install the plugin through the client's Plugin Directory, marketplace, or
   local import workflow. For a portable client, load the plugin root—the
   directory containing `plugin.json`.
2. Ensure the client enables both the `system` skill and the `system` MCP server.
   A client may conform while supporting only one portable component type.
3. Start the connection. When prompted, complete Thoughtful Systems' browser sign-in and
   consent flow using the intended account and organization.
4. Never ask the user to paste a bearer token into chat or put one in
   `plugin.json`, `.mcp.json`, `mcp.json`, headers, environment variables,
   source control, or an agent memory.
5. Reload the client after installation if its plugin or MCP discovery is not
   live.

If the client loads Agent Skills but not MCP servers, add the same endpoint
through the client's native remote-MCP settings. Keep authentication
client-managed.

## Verify an authenticated connection

Do not treat MCP initialization or tool definitions alone as proof of a usable
connection. Perform an authenticated read:

1. Confirm the stable tools include:
   - `toggle_build_mode`
   - `system_catalog`
   - `system_use`
   - `system_tasks`
   - `system_inbox`
2. Select use mode explicitly:

   ```json
   { "mode": "use" }
   ```

3. Call `system_catalog` with:

   ```json
   { "action": "list" }
   ```

A successful catalog result—even an empty authorized catalog—proves the MCP
request reached Thoughtful Systems as a verified user. A `401` or authorization challenge is
not success.

## Organization and mode behavior

- OAuth credentials are pinned to the organization selected during
  authorization. Changing the active organization in another browser session
  does not move an existing credential.
- Membership is rechecked on every MCP request. Removed membership takes
  effect without waiting for the credential to expire.
- Build/use mode is scoped to the current bearer credential and expires with
  it. It changes `system_catalog` and `system_use`, not the caller's permissions.
- A newly authenticated credential starts in use mode.

## Troubleshooting

### Authentication challenge or `401`

Let the client restart its normal OAuth flow. Do not manufacture tokens or
switch to a local development bootstrap.

### Skill loads but tools are absent

The client may support Agent Skills without Streamable HTTP MCP. Configure
`https://thoughtful.systems/mcp` through its native MCP UI or use a client that
supports both components.

### Tools load but catalog access fails

Confirm the user completed consent for the intended Thoughtful Systems organization. If the
credential was issued for another organization, reconnect and select the
correct organization during authorization.

### A published tool is missing

First confirm use mode. Then search the catalog again. Access, publication,
enablement, and organization membership are enforced live; do not attempt to
invoke a hidden namespace from an earlier catalog response.

### Builder actions are missing

Select build mode, then make a fresh `system_catalog` request. The mode switch
affects subsequent requests. The action may also require `manage` access to a
specific app even when it is visible in the builder catalog.
