import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , taskName, ...taskArgs] = process.argv;

if (!taskName) {
  console.error("Usage: node scripts/run-workspace-task.mjs <task> [--filter <workspace>]");
  process.exit(1);
}

const packageManagerPath = process.env.npm_execpath;
const packageManagerUserAgent = process.env.npm_config_user_agent ?? "";

if (!packageManagerPath || !packageManagerUserAgent.startsWith("pnpm/")) {
  console.error("Unable to locate the invoking package manager. Run this command with pnpm.");
  process.exit(1);
}

function loadRootEnvironment() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const envFile = readFileSync(envPath, "utf8");
  for (const line of envFile.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (
      key === "NODE_ENV" ||
      !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) ||
      process.env[key] !== undefined
    ) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadRootEnvironment();

const filterIndex = taskArgs.indexOf("--filter");
const filterName = filterIndex === -1 ? undefined : taskArgs[filterIndex + 1];

if (filterIndex !== -1 && filterName === undefined) {
  console.error("Missing workspace name after --filter.");
  process.exit(1);
}

const packageManagerArgs =
  filterName === undefined
    ? [packageManagerPath, "--recursive", "--workspace-concurrency=4", "run", taskName]
    : [packageManagerPath, "--filter", filterName, "run", taskName];

const result = spawnSync(process.execPath, packageManagerArgs, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  windowsHide: true
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
