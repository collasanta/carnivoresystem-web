import { NextResponse, type NextRequest } from "next/server";

/** leodiet.com is the Leo app's home: serve the landing at / and share the legal pages. */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host.endsWith("leodiet.com") && req.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/leo", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
