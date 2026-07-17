import { SetMetadata } from "@nestjs/common";

import type { OrganizationPermission } from "@atlas/domain";

export const requiredPermissionsMetadataKey = Symbol("requiredPermissions");

export const RequirePermission = (...permissions: OrganizationPermission[]) =>
  SetMetadata(requiredPermissionsMetadataKey, permissions);
