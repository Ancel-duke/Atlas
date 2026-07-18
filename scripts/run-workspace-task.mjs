import { spawnSync } from "node:child_process";

const [, , taskName] = process.argv;

if (!taskName) {
  console.error("Usage: node scripts/run-workspace-task.mjs <task>");
  process.exit(1);
}

const packageManagerPath = process.env.npm_execpath;
const packageManagerUserAgent = process.env.npm_config_user_agent ?? "";

if (!packageManagerPath || !packageManagerUserAgent.startsWith("pnpm/")) {
  console.error("Unable to locate the invoking package manager. Run this command with pnpm.");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [packageManagerPath, "--recursive", "--workspace-concurrency=4", "run", taskName],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    windowsHide: true
  }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
