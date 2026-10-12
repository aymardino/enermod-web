import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { LayoutAssistant } from "@/components/assistant/layout-assistant";
import { ObservatoryNav } from "@/components/observatory/sub-nav";
import { PageViewTracker } from "@/components/observatory/page-view";

export default function ObservatoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <ObservatoryNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <LayoutAssistant />
      <PageViewTracker />
    </>
  );
}
