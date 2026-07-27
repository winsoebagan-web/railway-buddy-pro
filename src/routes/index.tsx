import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { fetchAppBundle, bumpViewers, fetchViewerCount, type AppBundle } from "@/lib/data";
import { useCached, useOnline, useHydrated } from "@/lib/offline";
import { mmNum } from "@/lib/mm";
import { Splash } from "@/components/app/Splash";
import { MarqueeBar } from "@/components/app/MarqueeBar";
import { ScheduleSection } from "@/components/app/ScheduleSection";
import { PostsSection } from "@/components/app/PostsSection";
import { ReportsSection } from "@/components/app/ReportsSection";
import { SuggestionsSection } from "@/components/app/SuggestionsSection";
import { AudioSection } from "@/components/app/AudioSection";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "မိုးညှင်း ရထားခရီးစဉ် | အချိန်ဇယားနှင့် လက်မှတ်ခ" },
      {
        name: "description",
        content:
          "မိုးညှင်း – မြစ်ကြီးနား ရထားခရီးစဉ်များ၏ အချိန်ဇယား၊ ဘူတာစာရင်းနှင့် လက်မှတ်ခများကို အလွယ်တကူ ရှာဖွေကြည့်ရှုပါ။",
      },
      { property: "og:title", content: "မိုးညှင်း ရထားခရီးစဉ် | အချိန်ဇယားနှင့် လက်မှတ်ခ" },
      {
        property: "og:description",
        content: "မိုးညှင်း – မြစ်ကြီးနား ရထားခရီးစဉ်များ၏ အချိန်ဇယား၊ ဘူတာစာရင်းနှင့် လက်မှတ်ခများကို အလွယ်တကူ ရှာဖွေကြည့်ရှုပါ။",
      },
    ],
  }),
  component: Home,
});

const EMPTY: AppBundle = {
  stations: [],
  trains: [],
  posts: [],
  reports: [],
  suggestions: [],
  audios: [],
  marquees: [],
  splash: [],
  sections: [],
  fetchedAt: "",
};

function Home() {
  const hydrated = useHydrated();
  const online = useOnline();
  const { data, loading, refresh } = useCached<AppBundle>("app-bundle", fetchAppBundle);
  const bundle = data ?? EMPTY;
  const [viewers, setViewers] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    bumpViewers()
      .then((n) => active && setViewers(n))
      .catch(() => {
        fetchViewerCount()
          .then((n) => active && setViewers(n))
          .catch(() => undefined);
      });
    return () => {
      active = false;
    };
  }, []);

  const sections = bundle.sections.filter((s) => s.is_visible);

  return (
    <div className="min-h-screen bg-background pb-10">
      {hydrated ? <Splash slides={bundle.splash} /> : null}

      <header className="surface-header sticky top-0 z-30 px-4 py-3 shadow-card">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <span className="text-2xl">🚆</span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-primary-foreground">
              မိုးညှင်း ရထားခရီးစဉ်
            </h1>
            <p className="truncate text-[11px] text-primary-foreground/85">
              အချိန်ဇယား · ဘူတာ · လက်မှတ်ခ
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-card/85 px-2 py-1 text-[11px] font-semibold text-primary">
            <Eye className="size-3.5" />
            {viewers === null ? "…" : mmNum(viewers.toLocaleString("en-US"))} ဦး
          </span>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
              online ? "bg-leaf text-leaf-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </header>

      <MarqueeBar items={bundle.marquees} position="top" />

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-5">
        {!online && bundle.fetchedAt ? (
          <p className="rounded-xl bg-sun/25 p-3 text-xs text-sun-foreground">
            အင်တာနက် မရှိပါ။ နောက်ဆုံး သိမ်းဆည်းထားသော အချက်အလက်များကို ပြသနေပါသည်။
          </p>
        ) : null}

        {sections.map((section) => (
          <section key={section.key} id={section.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-5 w-1.5 rounded-full bg-leaf" />
              <h2 className="text-base font-bold text-primary">{section.label}</h2>
            </div>
            {section.key === "news" ? <PostsSection posts={bundle.posts} /> : null}
            {section.key === "schedule" ? (
              <ScheduleSection trains={bundle.trains} stations={bundle.stations} />
            ) : null}
            {section.key === "reports" ? (
              <ReportsSection
                reports={bundle.reports}
                stations={bundle.stations}
                trains={bundle.trains}
                onChanged={refresh}
              />
            ) : null}
            {section.key === "suggestions" ? (
              <SuggestionsSection suggestions={bundle.suggestions} onChanged={refresh} />
            ) : null}
            {section.key === "audio" ? <AudioSection audios={bundle.audios} /> : null}
          </section>
        ))}

        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> အသစ်ရယူရန်
          </Button>
        </div>
      </main>

      <MarqueeBar items={bundle.marquees} position="bottom" />
    </div>
  );
}
