import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { runProcess } from "./processes.js";
export async function probeSandbox(cwd: string, signal: AbortSignal) {
  const name = "claude-sdk57-" + randomUUID(),
    env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  const args = [
    "create",
    "--name",
    name,
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--memory",
    "128m",
    "--cpus",
    "0.5",
    "--pids-limit",
    "32",
    "--user",
    "1000:1000",
    "--mount",
    `type=bind,source=${join(cwd, "docs")},target=/docs,readonly`,
    "claude-sdk-lesson57:local",
  ];
  const create = await runProcess("docker", args, { cwd, env, signal });
  if (create.exitCode !== 0)
    throw new Error(
      "Docker probe needs a running engine and npm run docker:build. " +
        create.stderr.slice(-400),
    );
  try {
    const inspect = await runProcess("docker", ["inspect", name], {
      cwd,
      env,
      signal,
    });
    const data = JSON.parse(inspect.stdout)[0];
    if (
      data.HostConfig.NetworkMode !== "none" ||
      !data.HostConfig.ReadonlyRootfs ||
      data.Mounts.some((m: any) => m.RW)
    )
      throw new Error(
        "Docker isolation configuration rejected before execution.",
      );
    const execution = await runProcess("docker", ["start", "--attach", name], {
      cwd,
      env,
      signal,
    });
    const actual = JSON.parse(execution.stdout.trim());
    return {
      networkMode: data.HostConfig.NetworkMode,
      readOnlyRootfs: data.HostConfig.ReadonlyRootfs,
      readOnlyMounts: data.Mounts.every((m: any) => !m.RW),
      execution,
      actual,
      scope:
        "Only this fixed probe runs in Docker. The SDK controller stays on the host and needs model API connectivity.",
    };
  } finally {
    if (!/^claude-sdk57-[a-f0-9-]{36}$/.test(name))
      throw new Error("Container cleanup scope rejected.");
    await runProcess("docker", ["rm", "--force", name], { cwd, env });
  }
}
