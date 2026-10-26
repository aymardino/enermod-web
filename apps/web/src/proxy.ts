import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/** One public address. With CANONICAL_HOST set (enermod.africa), a page opened on another host
 *  the service answers on (enermod-web.onrender.com, www.) is sent to the same page on the
 *  canonical one, so links, cookies and the Google sign-in all live on one origin. */
const canonical = (process.env.CANONICAL_HOST ?? "").trim().toLowerCase();

export default function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (canonical && host && host !== canonical) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = canonical;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return intl(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
