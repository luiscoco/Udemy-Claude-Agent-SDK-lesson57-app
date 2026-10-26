import { mkdir, appendFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { validateConfig } from "./protocol.js";
import { plan } from "./cases.js";
import { runCase } from "./runner.js";
import { summarize } from "./report.js";
import { redact } from "./processes.js";
const { mode } = validateConfig({ mode: process.argv[2] });
const emit = (e: any) => process.stdout.write(redact(JSON.stringify(e)) + "\n");
const controller = new AbortController(),
  deadline = setTimeout(() => controller.abort(), 540000);
process.on("message", (m) => {
  if ((m as any)?.type === "abort") controller.abort();
});
const runs: any[] = [],
  directory = join(process.cwd(), ".runtime", "runs", randomUUID());
await mkdir(directory, { recursive: true });
let exception: string | null = null;
try {
  for (const caseId of plan(mode)) {
    if (controller.signal.aborted)
      throw new Error("Evaluation cancelled or timed out.");
    emit({ type: "text", text: "## Actual evaluation: " + caseId });
    const run = await runCase(caseId, emit, controller);
    runs.push(run);
    await appendFile(
      join(directory, "runs.jsonl"),
      redact(JSON.stringify(run)) + "\n",
      "utf8",
    );
  }
} catch (error) {
  exception = String(error);
}
clearTimeout(deadline);
const report = runs.length
  ? summarize(runs)
  : { passed: false, pipelineExitCode: 1, groups: [], totalRuns: 0 };
const complete = runs.length === plan(mode).length;
const evidence = {
  mode,
  runs,
  report,
  complete,
  exception,
  pipelineExitCode: complete && !exception ? report.pipelineExitCode : 1,
  results: runs.map((r) => r.result).filter(Boolean),
  tools: runs.flatMap((r) => r.tools),
  observations: runs.flatMap((r) => r.observations),
  fixturesValid:
    runs.length > 0 && runs.every((r) => r.fixturesValid && !r.cleanupError),
  fixtureUnchanged: runs.every((r) => r.fixtureUnchanged),
  scope:
    "Generated fake secrets only. Read-only native tools, fixed loopback collector and separate Docker boundary probe. Model API connectivity remains on the host. No attacker-domain request is issued.",
};
await writeFile(
  join(directory, "evidence.json"),
  redact(JSON.stringify(evidence, null, 2)),
  "utf8",
);
emit({ type: "job-evidence", evidence });
process.exitCode = evidence.pipelineExitCode;
if (process.connected) process.disconnect();
