import { NextResponse, type NextRequest } from "next/server";

/**
 * leodiet.com is the Leo app's home: serve the landing at / and share the legal pages.
 * /quiz/* (web2app funnel) gets an `x-w2a` request header so the root layout renders it full-bleed, in Portuguese,
 * without the site header.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/quiz" || pathname.startsWith("/quiz/")) {
    const headers = new Headers(req.headers);
    headers.set("x-w2a", "1");
    return NextResponse.next({ request: { headers } });
  }
  const host = req.headers.get("host") ?? "";
  if (host.endsWith("leodiet.com") && pathname === "/") {
    return NextResponse.rewrite(new URL("/leo", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/quiz", "/quiz/:path*"] };
