import { parseWebEnvironment, type WebEnvironment } from "@atlas/config";

let cachedEnvironment: WebEnvironment | undefined;

const buildPlaceholderSecret = "atlas-build-placeholder-secret-000000";

function isNextProductionBuild(source: NodeJS.ProcessEnv): boolean {
  return source["NEXT_PHASE"] === "phase-production-build";
}

export function getWebEnvironment(source: NodeJS.ProcessEnv = process.env): WebEnvironment {
  if (cachedEnvironment !== undefined) {
    return cachedEnvironment;
  }

  const environmentSource = isNextProductionBuild(source)
    ? {
        ...source,
        ATLAS_INTERNAL_API_SECRET: source["ATLAS_INTERNAL_API_SECRET"] ?? buildPlaceholderSecret,
        AUTH_GITHUB_ID: source["AUTH_GITHUB_ID"] ?? "atlas-build-github-client-id",
        AUTH_GITHUB_SECRET: source["AUTH_GITHUB_SECRET"] ?? "atlas-build-github-client-secret",
        AUTH_SECRET: source["AUTH_SECRET"] ?? buildPlaceholderSecret,
        AUTH_URL: source["AUTH_URL"] ?? "http://localhost:3000"
      }
    : source;

  cachedEnvironment = parseWebEnvironment(environmentSource);
  return cachedEnvironment;
}
