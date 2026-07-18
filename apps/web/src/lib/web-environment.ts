import { parseWebEnvironment, type WebEnvironment } from "@atlas/config";

let cachedEnvironment: WebEnvironment | undefined;

export function getWebEnvironment(source: NodeJS.ProcessEnv = process.env): WebEnvironment {
  if (cachedEnvironment !== undefined) {
    return cachedEnvironment;
  }

  cachedEnvironment = parseWebEnvironment(source);
  return cachedEnvironment;
}
