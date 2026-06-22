import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Get the auth token from cookies
  const authToken = request.cookies.get("auth_token")?.value;

  const isAuthPage =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/register";

  // If the user is on an auth page and has a valid token, redirect to dashboard
  if (isAuthPage && authToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If the user is NOT on an auth page and has NO token, redirect to login
  if (!isAuthPage && !authToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Otherwise, allow the request to proceed
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, icons, etc (if any static assets in public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
