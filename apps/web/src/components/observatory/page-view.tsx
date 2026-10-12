"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { track } from "@/lib/track";

/** One page_view event per observatory route change. */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view", "", pathname);
  }, [pathname]);
  return null;
}
