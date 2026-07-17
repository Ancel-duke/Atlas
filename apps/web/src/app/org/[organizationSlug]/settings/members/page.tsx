import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@atlas/ui";

import { createAuthenticatedAtlasSdk, requireAtlasSession } from "../../../../../lib/atlas-api";
import { createInvitationAction } from "../../../../actions";

type MembersPageProps = {
  readonly params: Promise<{
    readonly organizationSlug: string;
  }>;
};

export default async function MembersPage(props: MembersPageProps): Promise<JSX.Element> {
  const { organizationSlug } = await props.params;
  const atlasSession = await requireAtlasSession().catch(() => redirect("/sign-in"));

  if (atlasSession.principal.organizationSlug !== organizationSlug) {
    notFound();
  }

  const sdk = await createAuthenticatedAtlasSdk();
  const [memberships, invitations] = await Promise.all([
    sdk.listMemberships(atlasSession.principal.organizationId),
    sdk.listInvitations(atlasSession.principal.organizationId)
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-sm font-medium text-slate-500">Organization settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            Members and invitations
          </h1>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/org/${organizationSlug}`}>Back to organization</Link>
        </Button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Memberships</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2 font-medium">User</th>
                  <th className="py-2 font-medium">Role</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership) => (
                  <tr key={membership.id} className="border-b border-slate-100">
                    <td className="py-3">
                      <p className="font-medium text-slate-950">{membership.email}</p>
                      <p className="text-slate-500">{membership.name ?? "Unnamed user"}</p>
                    </td>
                    <td className="py-3">{membership.role}</td>
                    <td className="py-3">{membership.status}</td>
                    <td className="py-3">{new Date(membership.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite member</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createInvitationAction} className="flex flex-col gap-3">
              <input
                name="organizationId"
                type="hidden"
                value={atlasSession.principal.organizationId}
              />
              <input name="organizationSlug" type="hidden" value={organizationSlug} />
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Email
                <input
                  required
                  name="email"
                  type="email"
                  className="rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Role
                <select name="role" className="rounded-md border border-slate-300 px-3 py-2">
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <Button type="submit">Create invitation</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 font-medium">Email</th>
                <th className="py-2 font-medium">Role</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="border-b border-slate-100">
                  <td className="py-3">{invitation.email}</td>
                  <td className="py-3">{invitation.role}</td>
                  <td className="py-3">{invitation.status}</td>
                  <td className="py-3">{new Date(invitation.expiresAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
