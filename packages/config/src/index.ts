import { z } from "zod";

const nodeEnvironmentSchema = z.enum(["development", "test", "production"]).default("development");

const logLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info");

const serverEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema,
  ATLAS_ENVIRONMENT: z.enum(["local", "test", "staging", "production"]).default("local"),
  ATLAS_LOG_LEVEL: logLevelSchema,
  ATLAS_API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  ATLAS_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(4),
  ATLAS_JWT_ISSUER: z.string().min(1),
  ATLAS_JWT_AUDIENCE: z.string().min(1),
  ATLAS_JWT_SECRET: z.string().min(32),
  ATLAS_INTERNAL_API_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  OTEL_SERVICE_NAME: z.string().min(1).default("atlas")
});

const webEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema,
  ATLAS_ENVIRONMENT: z.enum(["local", "test", "staging", "production"]).default("local"),
  ATLAS_WEB_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NEXT_PUBLIC_ATLAS_API_URL: z.string().url().default("http://localhost:4000"),
  ATLAS_INTERNAL_API_SECRET: z.string().min(32),
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url()
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;
export type WebEnvironment = z.infer<typeof webEnvironmentSchema>;

export function parseServerEnvironment(source: NodeJS.ProcessEnv): ServerEnvironment {
  return serverEnvironmentSchema.parse(source);
}

export function parseWebEnvironment(source: NodeJS.ProcessEnv): WebEnvironment {
  return webEnvironmentSchema.parse(source);
}

export const environmentSchemas = {
  server: serverEnvironmentSchema,
  web: webEnvironmentSchema
} as const;
