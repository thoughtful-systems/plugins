import { resolve } from "node:path";

type JsonObject = Record<string, unknown>;

const root = resolve(import.meta.dir, "..");
const pluginRoot = resolve(root, "vibe");

const fail = (message: string): never => {
  throw new TypeError(`Plugin validation failed: ${message}`);
};

const asObject = (value: unknown, label: string): JsonObject => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${label} must be an object.`);
  }
  return value as JsonObject;
};

const asString = (value: unknown, label: string): string =>
  typeof value === "string" && value.length > 0
    ? value
    : fail(`${label} must be a non-empty string.`);

const readJson = async (path: string): Promise<JsonObject> =>
  asObject(await Bun.file(path).json(), path);

const objectField = (value: JsonObject, key: string, label: string): JsonObject =>
  asObject(value[key], `${label}.${key}`);

const stringField = (value: JsonObject, key: string, label: string): string =>
  asString(value[key], `${label}.${key}`);

const arrayField = (value: JsonObject, key: string, label: string): unknown[] => {
  const selected = value[key];
  return Array.isArray(selected) ? selected : fail(`${label}.${key} must be an array.`);
};

const requireSame = (label: string, values: readonly string[]): void => {
  if (new Set(values).size !== 1) {
    fail(`${label} values differ: ${values.join(", ")}`);
  }
};

const requireFile = async (relativePath: string): Promise<void> => {
  if (!(await Bun.file(resolve(pluginRoot, relativePath)).exists())) {
    fail(`missing package file ${relativePath}.`);
  }
};

const portableManifest = await readJson(resolve(pluginRoot, "plugin.json"));
const rootPackage = await readJson(resolve(root, "package.json"));
const repositoryRoot = stringField(rootPackage, "repository", "root package");
const repositoryUrl = `${repositoryRoot.replace(/\/$/u, "")}/tree/main/vibe`;
const codexManifest = await readJson(resolve(pluginRoot, ".codex-plugin/plugin.json"));
const claudeManifest = await readJson(resolve(pluginRoot, ".claude-plugin/plugin.json"));
const claudeMarketplace = await readJson(resolve(root, ".claude-plugin/marketplace.json"));
const codexMarketplace = await readJson(resolve(root, ".agents/plugins/marketplace.json"));
const portableMcp = await readJson(resolve(pluginRoot, "mcp.json"));
const nativeMcp = await readJson(resolve(pluginRoot, ".mcp.json"));

const claudeEntry = asObject(
  arrayField(claudeMarketplace, "plugins", "Claude marketplace")[0],
  "Claude marketplace.plugins[0]",
);
const codexEntry = asObject(
  arrayField(codexMarketplace, "plugins", "Codex marketplace")[0],
  "Codex marketplace.plugins[0]",
);

requireSame("plugin name", [
  stringField(portableManifest, "name", "portable manifest"),
  stringField(codexManifest, "name", "Codex manifest"),
  stringField(claudeManifest, "name", "Claude manifest"),
  stringField(claudeEntry, "name", "Claude marketplace entry"),
  stringField(codexEntry, "name", "Codex marketplace entry"),
]);
requireSame("plugin version", [
  stringField(portableManifest, "version", "portable manifest"),
  stringField(codexManifest, "version", "Codex manifest"),
  stringField(claudeManifest, "version", "Claude manifest"),
  stringField(claudeEntry, "version", "Claude marketplace entry"),
]);
requireSame("repository URL", [
  stringField(portableManifest, "repository", "portable manifest"),
  stringField(codexManifest, "repository", "Codex manifest"),
  stringField(claudeManifest, "repository", "Claude manifest"),
  stringField(claudeEntry, "repository", "Claude marketplace entry"),
  repositoryUrl,
]);

if (stringField(claudeEntry, "source", "Claude marketplace entry") !== "./vibe") {
  fail("Claude marketplace source must be ./vibe.");
}
const codexSource = objectField(codexEntry, "source", "Codex marketplace entry");
if (
  stringField(codexSource, "source", "Codex marketplace source") !== "local" ||
  stringField(codexSource, "path", "Codex marketplace source") !== "./vibe"
) {
  fail("Codex marketplace source must be local ./vibe.");
}

const nativeServer = objectField(
  objectField(nativeMcp, "mcpServers", "native MCP"),
  "vibe",
  "native MCP.mcpServers",
);
const portableServer = objectField(
  objectField(portableMcp, "mcpServers", "portable MCP"),
  "vibe",
  "portable MCP.mcpServers",
);
const nativeUrl = stringField(nativeServer, "url", "native Vibe server");
const portableUrl = stringField(portableServer, "url", "portable Vibe server");
requireSame("MCP URL", [nativeUrl, portableUrl]);

const endpoint = URL.parse(nativeUrl);
if (endpoint?.protocol !== "https:" || endpoint.pathname !== "/mcp") {
  fail(`MCP URL must be an HTTPS /mcp endpoint, received ${nativeUrl}.`);
}
for (const forbidden of ["headers", "env", "token", "secret"]) {
  if (forbidden in nativeServer || forbidden in portableServer) {
    fail(`MCP manifests must not contain ${forbidden}.`);
  }
}

for (const relativePath of [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".mcp.json",
  "SETUP.md",
  "assets/vibe-mark.svg",
  "skills/vibe/SKILL.md",
  "skills/vibe/agents/openai.yaml",
]) {
  await requireFile(relativePath);
}

const codexInterface = objectField(codexManifest, "interface", "Codex manifest");
const prompts = arrayField(codexInterface, "defaultPrompt", "Codex interface");
if (
  prompts.length > 3 ||
  prompts.some((prompt) => typeof prompt !== "string" || prompt.length > 128)
) {
  fail("Codex starter prompts must contain at most three strings of 128 characters.");
}

const forbiddenPublicReferences = [
  ["github.com", "skynnes", "vibe"].join("/"),
  ["agent", "plugins/vibe"].join("-"),
  ["apps", "vibe-mcp"].join("/"),
  [".dev", "vars"].join("."),
];
const publicGlob = new Bun.Glob("**/*.{json,md,ts,js,yaml,yml,svg}");
for await (const relativePath of publicGlob.scan({
  cwd: root,
  dot: true,
  onlyFiles: true,
})) {
  if (
    relativePath.startsWith(".git/") ||
    relativePath === "bun.lock" ||
    relativePath === "scripts/validate-agent-plugins.ts"
  ) {
    continue;
  }
  const contents = await Bun.file(resolve(root, relativePath)).text();
  for (const forbidden of forbiddenPublicReferences) {
    if (contents.includes(forbidden)) {
      fail(`${relativePath} contains private-repository reference ${forbidden}.`);
    }
  }
}

process.stdout.write(
  `Validated Vibe plugin ${stringField(codexManifest, "version", "Codex manifest")} for ${nativeUrl}.\n`,
);
