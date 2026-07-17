import { SetMetadata } from "@nestjs/common";

export const isPublicRouteMetadataKey = "atlas:is-public-route";

export const Public = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(isPublicRouteMetadataKey, true);
