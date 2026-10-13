import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { LayoutAssistant } from "@/components/assistant/layout-assistant";
import { ObservatoryNav } from "@/components/observatory/sub-nav";
import { PageViewTracker } from "@/components/observatory/page-view";

/** Observatory shell: masthead, sub-nav (sticky under the masthead from 1024px), page.
 *  The data pages widen to 1400px at 2xl, so the chrome does too. */
export default function ObservatoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader wide />
      <ObservatoryNav />
      <main id="main" className="flex-1 bg-muted">{children}</main>
      <SiteFooter wide />
      <LayoutAssistant />
      <PageViewTracker />
    </>
  );
}
