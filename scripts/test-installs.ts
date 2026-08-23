import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const nativeMcp = (await Bun.file(resolve(root, "vibe/.mcp.json")).json()) as {
  mcpServers: { vibe: { url: string } };
};
const expectedMcpUrl = nativeMcp.mcpServers.vibe.url;

const run = async (command: string[], extraEnv: Record<string, string>): Promise<string> => {
  const process = Bun.spawn(command, {
    cwd: root,
    env: { ...Bun.env, ...extraEnv },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed with exit code ${exitCode}:\n${stderr || stdout}`);
  }
  return stdout;
};

const codexHome = await mkdtemp(join(tmpdir(), "vibe-codex-"));
const claudeHome = await mkdtemp(join(tmpdir(), "vibe-claude-"));

try {
  const codexEnv = { CODEX_HOME: codexHome };
  await run(["codex", "plugin", "marketplace", "add", root, "--json"], codexEnv);
  await run(["codex", "plugin", "add", "vibe@thoughtful-systems", "--json"], codexEnv);
  const codexList = JSON.parse(await run(["codex", "plugin", "list", "--json"], codexEnv)) as {
    installed?: { enabled?: boolean; pluginId?: string }[];
  };
  if (
    !codexList.installed?.some(
      (plugin) => plugin.pluginId === "vibe@thoughtful-systems" && plugin.enabled === true,
    )
  ) {
    throw new Error("Codex did not report Vibe as an enabled plugin.");
  }

  const claudeEnv = { CLAUDE_CONFIG_DIR: claudeHome };
  await run(["claude", "plugin", "marketplace", "add", root], claudeEnv);
  await run(["claude", "plugin", "install", "vibe@thoughtful-systems"], claudeEnv);
  const claudeList = JSON.parse(await run(["claude", "plugin", "list", "--json"], claudeEnv)) as {
    enabled?: boolean;
    id?: string;
    mcpServers?: { vibe?: { url?: string } };
  }[];
  if (
    !claudeList.some(
      (plugin) =>
        plugin.id === "vibe@thoughtful-systems" &&
        plugin.enabled === true &&
        plugin.mcpServers?.vibe?.url === expectedMcpUrl,
    )
  ) {
    throw new Error("Claude did not report Vibe with the expected MCP server.");
  }
} finally {
  await Promise.all([
    rm(codexHome, { force: true, recursive: true }),
    rm(claudeHome, { force: true, recursive: true }),
  ]);
}

process.stdout.write("OpenAI and Claude isolated marketplace installs passed.\n");
