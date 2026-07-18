"use server";

import { redirect } from "next/navigation";

import {
  createCorrectionRequestSchema,
  createEvidenceItemRequestSchema,
  createInvitationRequestSchema,
  createMemoryRecordRequestSchema,
  createOrganizationRequestSchema,
  createReasoningRunRequestSchema,
  createRepositoryRequestSchema,
  reviewCorrectionRequestSchema,
  switchOrganizationRequestSchema,
  transitionMemoryLifecycleRequestSchema,
  updateRepositoryRequestSchema
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

export async function createRepositoryAction(formData: FormData): Promise<void> {
  const organizationSlug = requiredFormValue(formData, "organizationSlug");
  const request = createRepositoryRequestSchema.parse({
    provider: "github",
    providerRepositoryId: requiredFormValue(formData, "providerRepositoryId"),
    name: requiredFormValue(formData, "name"),
    defaultBranch: requiredFormValue(formData, "defaultBranch")
  });
  const sdk = await createAuthenticatedAtlasSdk();
  const repository = await sdk.createRepository(request);
  redirect(`/org/${organizationSlug}/repositories/${repository.id}/pulse`);
}

export async function updateRepositoryAction(formData: FormData): Promise<void> {
  const organizationSlug = requiredFormValue(formData, "organizationSlug");
  const repositoryId = requiredFormValue(formData, "repositoryId");
  const request = updateRepositoryRequestSchema.parse({
    name: requiredFormValue(formData, "name"),
    defaultBranch: requiredFormValue(formData, "defaultBranch"),
    connectionStatus: requiredFormValue(formData, "connectionStatus")
  });
  const sdk = await createAuthenticatedAtlasSdk();
  await sdk.updateRepository(repositoryId, request);
  redirect(`/org/${organizationSlug}/repositories/${repositoryId}/settings`);
}

export async function calculateRepositoryPulseAction(formData: FormData): Promise<void> {
  const organizationSlug = requiredFormValue(formData, "organizationSlug");
  const repositoryId = requiredFormValue(formData, "repositoryId");
  const sdk = await createAuthenticatedAtlasSdk();
  await sdk.calculateRepositoryPulse(repositoryId);
  redirect(`/org/${organizationSlug}/repositories/${repositoryId}/pulse`);
}

export async function createReasoningRunAction(formData: FormData): Promise<void> {
  const organizationSlug = requiredFormValue(formData, "organizationSlug");
  const repositoryId = optionalFormValue(formData, "repositoryId");
  const request = createReasoningRunRequestSchema.parse({
    question: requiredFormValue(formData, "question"),
    repositoryId,
    memoryRecordIds: []
  });
  const sdk = await createAuthenticatedAtlasSdk();
  await sdk.createReasoningRun(request);
  redirect(`/org/${organizationSlug}/chat`);
}

function optionalFormValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

function manualMemoryProvenance() {
  return {
    sourceType: "atlas-ui",
    sourceLocator: "engineering-memory/manual-entry",
    sourceRevision: null,
    observedAt: new Date().toISOString(),
    extractionMethod: "human-entered",
    actor: "authenticated-user",
    evidence: []
  };
}

export async function createMemoryRecordAction(formData: FormData): Promise<void> {
  const organizationSlug = requiredFormValue(formData, "organizationSlug");
  const request = createMemoryRecordRequestSchema.parse({
    classification: requiredFormValue(formData, "classification"),
    claim: requiredFormValue(formData, "claim"),
    owner: optionalFormValue(formData, "owner"),
    reasoning: optionalFormValue(formData, "reasoning"),
    provenance: manualMemoryProvenance(),
    confidenceScore: Number.parseInt(requiredFormValue(formData, "confidenceScore"), 10),
    confidenceMethod: "human-entered",
    confidenceFactors: { source: "manual" },
    missingEvidence: [],
    counterevidence: [],
    changeReason: "memory record created from Engineering Memory UI"
  });
  const sdk = await createAuthenticatedAtlasSdk();
  await sdk.createMemoryRecord(request);
  redirect(`/org/${organizationSlug}/memory`);
}

export async function addMemoryEvidenceAction(formData: FormData): Promise<void> {
  const organizationSlug = requiredFormValue(formData, "organizationSlug");
  const memoryRecordId = requiredFormValue(formData, "memoryRecordId");
  const request = createEvidenceItemRequestSchema.parse({
    sourceType: requiredFormValue(formData, "sourceType"),
    sourceLocator: requiredFormValue(formData, "sourceLocator"),
    sourceRevision: optionalFormValue(formData, "sourceRevision"),
    extractionMethod: requiredFormValue(formData, "extractionMethod"),
    direction: requiredFormValue(formData, "direction"),
    observedAt: new Date().toISOString(),
    metadata: {},
    provenance: manualMemoryProvenance(),
    changeReason: "evidence added from Engineering Memory UI"
  });
  const sdk = await createAuthenticatedAtlasSdk();
  await sdk.addMemoryEvidence(memoryRecordId, request);
  redirect(`/org/${organizationSlug}/memory/${memoryRecordId}`);
}

export async function createMemoryCorrectionAction(formData: FormData): Promise<void> {
  const organizationSlug = requiredFormValue(formData, "organizationSlug");
  const memoryRecordId = requiredFormValue(formData, "memoryRecordId");
  const proposedConfidenceValue = optionalFormValue(formData, "proposedConfidenceScore");
  const request = createCorrectionRequestSchema.parse({
    rationale: requiredFormValue(formData, "rationale"),
    proposedClaim: optionalFormValue(formData, "proposedClaim"),
    proposedLifecycle: optionalFormValue(formData, "proposedLifecycle"),
    proposedConfidenceScore:
      proposedConfidenceValue === null ? null : Number.parseInt(proposedConfidenceValue, 10),
    provenance: manualMemoryProvenance(),
    changeReason: "correction requested from Engineering Memory UI"
  });
  const sdk = await createAuthenticatedAtlasSdk();
  await sdk.createMemoryCorrection(memoryRecordId, request);
  redirect(`/org/${organizationSlug}/memory/${memoryRecordId}`);
}

export async function transitionMemoryLifecycleAction(formData: FormData): Promise<void> {
  const organizationSlug = requiredFormValue(formData, "organizationSlug");
  const memoryRecordId = requiredFormValue(formData, "memoryRecordId");
  const request = transitionMemoryLifecycleRequestSchema.parse({
    lifecycle: requiredFormValue(formData, "lifecycle"),
    rationale: requiredFormValue(formData, "rationale")
  });
  const sdk = await createAuthenticatedAtlasSdk();
  await sdk.transitionMemoryLifecycle(memoryRecordId, request);
  redirect(`/org/${organizationSlug}/memory/${memoryRecordId}`);
}

export async function reviewMemoryCorrectionAction(formData: FormData): Promise<void> {
  const organizationSlug = requiredFormValue(formData, "organizationSlug");
  const memoryRecordId = requiredFormValue(formData, "memoryRecordId");
  const correctionId = requiredFormValue(formData, "correctionId");
  const request = reviewCorrectionRequestSchema.parse({
    decision: requiredFormValue(formData, "decision"),
    rationale: requiredFormValue(formData, "rationale")
  });
  const sdk = await createAuthenticatedAtlasSdk();
  await sdk.reviewMemoryCorrection(correctionId, request);
  redirect(`/org/${organizationSlug}/memory/${memoryRecordId}`);
}
