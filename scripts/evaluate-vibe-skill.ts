/// <reference types="bun" />

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import {
  EVAL_CASES,
  type EvalCase,
  type EvalCondition,
  type ToolCallRecord,
} from "../evals/vibe-skill/cases.ts";

interface RunnerOptions {
  readonly caseIds: ReadonlySet<string>;
  readonly conditions: readonly EvalCondition[];
  readonly dryRun: boolean;
  readonly label: string;
  readonly model: string;
  readonly thinking: string;
  readonly timeoutMs: number;
  readonly trials: number;
}

interface RunResult {
  readonly condition: EvalCondition;
  readonly criteria: readonly {
    readonly description: string;
    readonly id: string;
    readonly passed: boolean;
  }[];
  readonly durationMs: number;
  readonly error: string | null;
  readonly finalText: string;
  readonly passed: number;
  readonly scenarioId: string;
  readonly score: number;
  readonly settled: boolean;
  readonly skillReads: readonly string[];
  readonly timedOut: boolean;
  readonly toolCalls: readonly ToolCallRecord[];
  readonly total: number;
  readonly transcript: string;
  readonly trial: number;
}

interface RunCaseOptions {
  readonly condition: EvalCondition;
  readonly runDirectory: string;
  readonly scenario: EvalCase;
  readonly trial: number;
  readonly workingDirectory: string;
}

const root = resolve(import.meta.dir, "..");
const extensionPath = resolve(root, "evals/vibe-skill/mock-vibe.ts");
const skillPath = resolve(root, "vibe/skills/vibe");
const artifactRoot = resolve(root, ".vibe-skill-evals");

const skillFiles: string[] = [];
for await (const relativePath of new Bun.Glob("**/*").scan({
  cwd: skillPath,
  dot: true,
  onlyFiles: true,
})) {
  skillFiles.push(relativePath);
}
skillFiles.sort((left, right) => left.localeCompare(right));
const skillHash = createHash("sha256");
for (const relativePath of skillFiles) {
  skillHash.update(relativePath);
  skillHash.update("\0");
  skillHash.update(await Bun.file(resolve(skillPath, relativePath)).bytes());
  skillHash.update("\0");
}
const skillFingerprint = skillHash.digest("hex").slice(0, 16);

const valuesFor = (name: string): readonly string[] => {
  const inlinePrefix = `--${name}=`;
  const values: string[] = [];
  for (let index = 0; index < Bun.argv.length; index += 1) {
    const argument = Bun.argv[index] ?? "";
    if (argument.startsWith(inlinePrefix)) {
      values.push(argument.slice(inlinePrefix.length));
    } else if (argument === `--${name}`) {
      const value = Bun.argv[index + 1];
      if (value) {
        values.push(value);
      }
    }
  }
  return values;
};

const valueFor = (name: string, fallback: string): string => valuesFor(name).at(-1) ?? fallback;

const positiveInteger = (name: string, fallback: number): number => {
  const raw = valueFor(name, String(fallback));
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer; received ${raw}.`);
  }
  return value;
};

const conditionValues = valuesFor("condition");
const conditions: readonly EvalCondition[] =
  conditionValues.length === 0 || conditionValues.includes("both")
    ? ["baseline", "skill"]
    : conditionValues.map((value) => {
        if (value !== "baseline" && value !== "skill") {
          throw new Error(`Unknown condition: ${value}.`);
        }
        return value;
      });

const options: RunnerOptions = {
  caseIds: new Set(valuesFor("case")),
  conditions,
  dryRun: Bun.argv.includes("--dry-run"),
  label: valueFor("label", "working-tree"),
  model: valueFor("model", process.env.VIBE_SKILL_EVAL_MODEL ?? "openai-codex/gpt-5.4-mini"),
  thinking: valueFor("thinking", process.env.VIBE_SKILL_EVAL_THINKING ?? "low"),
  timeoutMs: positiveInteger("timeout-ms", 3 * 60_000),
  trials: positiveInteger("trials", 1),
};

const selectedCases = EVAL_CASES.filter(
  (scenario) => options.caseIds.size === 0 || options.caseIds.has(scenario.id),
);
if (selectedCases.length === 0) {
  throw new Error("No evaluation cases matched --case.");
}
for (const requested of options.caseIds) {
  if (!EVAL_CASES.some((scenario) => scenario.id === requested)) {
    throw new Error(`Unknown evaluation case: ${requested}.`);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textFromMessage = (event: Record<string, unknown>): string => {
  const message = event.message;
  if (!isRecord(message) || message.role !== "assistant") {
    return "";
  }
  const content = message.content;
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .flatMap((part) =>
      isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : [],
    )
    .join("");
};

const runCase = async ({
  condition,
  runDirectory,
  scenario,
  trial,
  workingDirectory,
}: RunCaseOptions): Promise<RunResult> => {
  const command = [
    "pi",
    "--mode",
    "json",
    "--print",
    "--no-session",
    "--no-context-files",
    "--no-prompt-templates",
    "--no-skills",
    "--no-extensions",
    "--approve",
    "--extension",
    extensionPath,
    "--tools",
    "read,toggle_build_mode,vibe_catalog,vibe_use,vibe_tasks,vibe_inbox",
    "--model",
    options.model,
    "--thinking",
    options.thinking,
    "--append-system-prompt",
    "Act as a business operations assistant. Use only applicable skill references and the available Vibe tools; do not inspect unrelated files.",
  ];
  if (condition === "skill") {
    command.push("--skill", skillPath);
  }
  command.push(scenario.prompt);

  const startedAt = Date.now();
  const child = Bun.spawn(command, {
    cwd: workingDirectory,
    env: { ...Bun.env, VIBE_SKILL_EVAL_CASE: scenario.id },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const stderrPromise = new Response(child.stderr).text();
  const reader = child.stdout.getReader();
  const decoder = new TextDecoder();
  const lines: string[] = [];
  const toolCalls: ToolCallRecord[] = [];
  let buffer = "";
  let finalText = "";
  let settled = false;
  let timedOut = false;

  const acceptLine = (line: string): void => {
    if (!line) {
      return;
    }
    lines.push(line);
    try {
      const event: unknown = JSON.parse(line);
      if (!isRecord(event)) {
        return;
      }
      if (event.type === "tool_execution_start" && typeof event.toolName === "string") {
        toolCalls.push({ name: event.toolName, input: event.args });
      } else if (event.type === "message_end") {
        finalText = textFromMessage(event) || finalText;
      } else if (event.type === "agent_settled") {
        settled = true;
      }
    } catch {
      // The transcript remains authoritative for malformed runner output.
    }
  };

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill(9);
  }, options.timeoutMs);

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      buffer += decoder.decode();
      break;
    }
    buffer += decoder.decode(chunk.value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      acceptLine(buffer.slice(0, newline).replace(/\r$/u, ""));
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
  }
  if (buffer) {
    acceptLine(buffer.replace(/\r$/u, ""));
  }

  const exitCode = await child.exited;
  clearTimeout(timeout);
  const stderr = await stderrPromise;
  const transcript = join(runDirectory, `${scenario.id}.${condition}.trial-${trial}.jsonl`);
  await Bun.write(transcript, `${lines.join("\n")}\n`);
  const criteria = scenario.rubric({ finalText, toolCalls });
  const passed = criteria.filter((item) => item.passed).length;
  const skillReads = toolCalls.flatMap((call) => {
    if (call.name !== "read" || !isRecord(call.input)) {
      return [];
    }
    const path = String(call.input.path ?? "");
    return /(?:SKILL|references\/[^/]+)\.md$/u.test(path) ? [basename(path)] : [];
  });

  return {
    condition,
    criteria,
    durationMs: Date.now() - startedAt,
    error: exitCode === 0 && !timedOut ? null : `exit=${exitCode}; ${stderr.slice(-2000)}`,
    finalText,
    passed,
    scenarioId: scenario.id,
    score: criteria.length === 0 ? 0 : passed / criteria.length,
    settled,
    skillReads,
    timedOut,
    toolCalls,
    total: criteria.length,
    transcript,
    trial,
  };
};

const runPlan = selectedCases.flatMap((scenario) =>
  options.conditions.flatMap((condition) =>
    Array.from({ length: options.trials }, (_, index) => ({
      condition,
      scenario,
      trial: index + 1,
    })),
  ),
);

if (options.dryRun) {
  process.stdout.write(
    `${JSON.stringify(
      {
        conditions: options.conditions,
        label: options.label,
        model: options.model,
        scenarios: selectedCases.map(({ category, id, prompt, useCase }) => ({
          category,
          id,
          prompt,
          useCase,
        })),
        thinking: options.thinking,
        skillFingerprint,
        totalRuns: runPlan.length,
        trials: options.trials,
      },
      null,
      2,
    )}\n`,
  );
} else {
  const runId = new Date().toISOString().replaceAll(":", "-");
  const runDirectory = resolve(artifactRoot, runId);
  const workingDirectory = await mkdtemp(join(tmpdir(), "vibe-skill-eval-"));
  await mkdir(runDirectory, { recursive: true });
  const results: RunResult[] = [];
  try {
    for (const item of runPlan) {
      process.stdout.write(
        `Running ${item.scenario.id} [${item.condition}] trial ${item.trial}...\n`,
      );
      const result = await runCase({
        scenario: item.scenario,
        condition: item.condition,
        trial: item.trial,
        runDirectory,
        workingDirectory,
      });
      results.push(result);
      process.stdout.write(
        `  ${(result.score * 100).toFixed(0)}% (${result.passed}/${result.total}), tools=${result.toolCalls.length}, skillReads=${result.skillReads.join(",") || "none"}\n`,
      );
    }
  } finally {
    await rm(workingDirectory, { force: true, recursive: true });
  }

  const aggregates = options.conditions.map((condition) => {
    const selected = results.filter((result) => result.condition === condition);
    const passed = selected.reduce((sum, result) => sum + result.passed, 0);
    const total = selected.reduce((sum, result) => sum + result.total, 0);
    return {
      condition,
      passed,
      score: total === 0 ? 0 : passed / total,
      skillActivationRate:
        condition === "skill"
          ? selected.filter((result) => result.skillReads.length > 0).length /
            Math.max(1, selected.length)
          : null,
      total,
    };
  });
  const reportPath = join(runDirectory, "report.json");
  await Bun.write(
    reportPath,
    JSON.stringify(
      {
        aggregates,
        finishedAt: new Date().toISOString(),
        label: options.label,
        model: options.model,
        results,
        skillFingerprint,
        suiteVersion: 1,
        thinking: options.thinking,
        trials: options.trials,
      },
      null,
      2,
    ),
  );
  for (const aggregate of aggregates) {
    process.stdout.write(
      `${aggregate.condition}: ${(aggregate.score * 100).toFixed(1)}% (${aggregate.passed}/${aggregate.total})${aggregate.skillActivationRate === null ? "" : `, activation=${(aggregate.skillActivationRate * 100).toFixed(0)}%`}\n`,
    );
  }
  process.stdout.write(`Report: ${reportPath}\n`);
  if (results.some((result) => result.error !== null || !result.settled)) {
    process.exitCode = 1;
  }
}
