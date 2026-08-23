# Repository instructions

This is a public distribution repository. Keep it limited to plugin manifests,
skills, MCP endpoint declarations, public documentation, validation tooling,
and listing assets.

- Never add product implementation source, deployment configuration, local
  environment files, credentials, tokens, cookies, customer data, review-user
  passwords, or private operational logs.
- Use Bun for dependencies and scripts.
- Keep each plugin version synchronized across its portable, Claude, Codex,
  and marketplace manifests.
- Keep native and portable MCP endpoint declarations identical and HTTPS-only.
- Do not add authentication headers or credentials to MCP manifests. OAuth is
  discovered and stored by the client.
- Run `bun run validate` and `bun run test:install` before publishing changes.
- Update package guidance only for behavior available on the production MCP
  release; verify the release before marketplace submission.
