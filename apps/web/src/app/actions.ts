"use server";

import { redirect } from "next/navigation";

import {
  createInvitationRequestSchema,
  createOrganizationRequestSchema,
  switchOrganizationRequestSchema
} from "@atlas/contracts";

import { signIn, signOut, updateSession } from "../auth";
import { createAuthenticatedAtlasSdk } from "../lib/atlas-api";

function requiredFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Form field "${key}" is required.`);
  }

  return value;
}

export async function signInWithGitHubAction(): Promise<void> {
  await signIn("github", { redirectTo: "/" });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function switchOrganizationAction(formData: FormData): Promise<void> {
  const request = switchOrganizationRequestSchema.parse({
    organizationId: requiredFormValue(formData, "organizationId")
  });
  const sdk = await createAuthenticatedAtlasSdk();
  const tokenResponse = await sdk.switchOrganization(request.organizationId);
  await updateSession({ atlas: tokenResponse });
  redirect(`/org/${tokenResponse.principal.organizationSlug}`);
}

export async function createOrganizationAction(formData: FormData): Promise<void> {
  const request = createOrganizationRequestSchema.parse({
    slug: requiredFormValue(formData, "slug"),
    displayName: requiredFormValue(formData, "displayName")
  });
  const sdk = await createAuthenticatedAtlasSdk();
  const tokenResponse = await sdk.createOrganization(request);
  await updateSession({ atlas: tokenResponse });
  redirect(`/org/${tokenResponse.principal.organizationSlug}`);
}

export async function createInvitationAction(formData: FormData): Promise<void> {
  const organizationId = requiredFormValue(formData, "organizationId");
  const organizationSlug = requiredFormValue(formData, "organizationSlug");
  const request = createInvitationRequestSchema.parse({
    email: requiredFormValue(formData, "email"),
    role: requiredFormValue(formData, "role")
  });
  const sdk = await createAuthenticatedAtlasSdk();
  await sdk.createInvitation(organizationId, request);
  redirect(`/org/${organizationSlug}/settings/members`);
}
