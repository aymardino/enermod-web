"use client";

import { usePathname } from "@/i18n/navigation";
import { AssistantWidget } from "@/components/assistant/assistant-widget";

/** The floating assistant for every observatory page except the recommender, which mounts
 *  its own widget with the ranking as context. */
export function LayoutAssistant() {
  const pathname = usePathname();
  if (pathname.startsWith("/observatory/recommender")) return null;
  return <AssistantWidget />;
}
