import { PrismaClient } from "@prisma/client";

export {
  ExternalAccountProvider,
  InvitationStatus,
  MembershipStatus,
  OrganizationRole,
  PrismaClient
} from "@prisma/client";
export type { Prisma } from "@prisma/client";

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const log = [
    { emit: "event" as const, level: "error" as const },
    { emit: "event" as const, level: "warn" as const }
  ];

  if (databaseUrl !== undefined) {
    return new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log
    });
  }

  return new PrismaClient({ log });
}
