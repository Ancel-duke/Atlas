import { NextResponse } from "next/server";

import { auth } from "./auth";

export default auth((request) => {
  if (request.auth === null) {
    const signInUrl = new URL("/sign-in", request.nextUrl);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/org/:path*", "/organizations/:path*"]
};
