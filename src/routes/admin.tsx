import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminSignIn, adminSignOut, isAdminSession } from "@/lib/admin-auth";
import {
  fetchAudios,
  fetchDemuSchedules,
  fetchLiveBoardSettings,
  fetchLiveNotices,
  fetchNoticeLetters,
  fetchNoticeVideos,
  fetchMarquees,
  fetchPosts,
  fetchReports,
  fetchSections,
  fetchSplashSlides,
  fetchStations,
  fetchNotifications,
  fetchTrains,
  fetchViewerCount,
  type Audio,
  type DemuSchedule,
  type LiveBoardSettings,
  type LiveNotice,
  type NoticeLetter,
  type NoticeVideo,
  type Marquee,
  type Post,
  type Report,
  type Section,
  type SplashSlide,
  type Station,
  type AppNotification,
  type TrainWithStops,
} from "@/lib/data";
import {
  AudiosPanel,
  DemuPanel,
  LiveBoardPanel,
  MarqueesPanel,
  PostsPanel,
  NoticeLettersPanel,
  NoticeVideosPanel,
  SectionsPanel,
  SplashPanel,
  StationsPanel,
  NotificationsPanel,
  TrainsPanel,
  ViewersPanel,
} from "@/components/admin/AdminPanels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiInfoPanel } from "@/components/admin/AiInfoPanel";
import { AiQuestionsPanel } from "@/components/admin/AiQuestionsPanel";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Dashboard | မိုးညှင်း ရထားခရီးစဉ်" },
      { name: "description", content: "ရထားအချိန်ဇယား၊ ပို့စ်နှင့် အကြောင်းအရာ စီမံခန့်ခွဲမှု စာမျက်နှာ။" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Dashboard" },
      { property: "og:description", content: "မိုးညှင်း ရထားခရီးစဉ် စီမံခန့်ခွဲမှု။" },
    ],
  }),
  component: AdminPage,
});

type AdminData = {
  stations: Station[];
  trains: TrainWithStops[];
  posts: Post[];
  reports: Report[];
  notifications: AppNotification[];
  audios: Audio[];
  marquees: Marquee[];
  splash: SplashSlide[];
  sections: Section[];
  liveNotices: LiveNotice[];
  liveSettings: LiveBoardSettings | null;
  demu: DemuSchedule[];
  noticeLetters: NoticeLetter[];
  noticeVideos: NoticeVideo[];
  viewers: number;
};

const EMPTY: AdminData = {
  stations: [],
  trains: [],
  posts: [],
  reports: [],
  notifications: [],
  audios: [],
  marquees: [],
  splash: [],
  sections: [],
  liveNotices: [],
  liveSettings: null,
  demu: [],
  noticeLetters: [],
  noticeVideos: [],
  viewers: 0,
};

const TABS = [
  { key: "sections", label: "ခေါင်းစဉ်များ" },
  { key: "trains", label: "ရထားများ" },
  { key: "stations", label: "ဘူတာများ" },
  { key: "posts", label: "ပို့စ်များ" },
  { key: "reports", label: "အသိပေးစာ" },
  { key: "notifications", label: "နိုတီ" },
  { key: "audios", label: "အသံဖိုင်" },
  { key: "live", label: "အသိပေးဘုတ်" },
  { key: "marquees", label: "စာတန်းပြေး" },
  { key: "splash", label: "ဖွင့်ချိန်ပြ" },
  { key: "demu", label: "DEMU" },
  { key: "viewers", label: "ကြည့်သူ" },
  { key: "ai", label: "AI သတင်း" },
];

function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<AdminData>(EMPTY);

  const load = useCallback(async () => {
    const [
      stations,
      trains,
      posts,
      reports,
      notifications,
      audios,
      marquees,
      splash,
      sections,
      liveNotices,
      liveSettings,
      demu,
      noticeLetters,
      noticeVideos,
      viewers,
    ] = await Promise.all([
      fetchStations(),
      fetchTrains(true),
      fetchPosts(),
      fetchReports(),
      fetchNotifications(),
      fetchAudios(),
      fetchMarquees(),
      fetchSplashSlides(),
      fetchSections(),
      fetchLiveNotices(),
      fetchLiveBoardSettings(),
      fetchDemuSchedules(),
      fetchNoticeLetters(),
      fetchNoticeVideos(),
      fetchViewerCount(),
    ]);
    setData({
      stations,
      trains,
      posts,
      reports,
      notifications,
      audios,
      marquees,
      splash,
      sections,
      liveNotices,
      liveSettings,
      demu,
      noticeLetters,
      noticeVideos,
      viewers,
    });
  }, []);

  useEffect(() => {
    let active = true;
    isAdminSession().then(async (ok) => {
      if (!active) return;
      setAuthed(ok);
      setChecking(false);
      if (ok) await load();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setAuthed(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        စစ်ဆေးနေသည်…
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin onSuccess={async () => {
      setAuthed(true);
      await load();
    }} />;
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="surface-header sticky top-0 z-20 flex items-center gap-2 px-4 py-3">
        <ShieldCheck className="size-5 text-primary-foreground" />
        <h1 className="flex-1 text-base font-bold text-primary-foreground">Admin Dashboard</h1>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await adminSignOut();
            setAuthed(false);
          }}
        >
          <LogOut className="size-4" /> ထွက်မည်
        </Button>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-4">
        <Tabs defaultValue="sections">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="sections" className="mt-4">
            <SectionsPanel rows={data.sections} refresh={load} />
          </TabsContent>
          <TabsContent value="trains" className="mt-4">
            <TrainsPanel rows={data.trains} stations={data.stations} refresh={load} />
          </TabsContent>
          <TabsContent value="stations" className="mt-4">
            <StationsPanel rows={data.stations} refresh={load} />
          </TabsContent>
          <TabsContent value="posts" className="mt-4">
            <PostsPanel rows={data.posts} refresh={load} />
          </TabsContent>
          <TabsContent value="reports" className="mt-4">
            <NoticeLettersPanel rows={data.noticeLetters} refresh={load} />
            <div className="mt-4">
              <NoticeVideosPanel rows={data.noticeVideos} refresh={load} />
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <NotificationsPanel rows={data.notifications} refresh={load} />
          </TabsContent>
          <TabsContent value="audios" className="mt-4">
            <AudiosPanel rows={data.audios} refresh={load} />
          </TabsContent>
          <TabsContent value="live" className="mt-4">
            <LiveBoardPanel rows={data.liveNotices} settings={data.liveSettings} refresh={load} />
          </TabsContent>
          <TabsContent value="marquees" className="mt-4">
            <MarqueesPanel rows={data.marquees} refresh={load} />
          </TabsContent>
          <TabsContent value="splash" className="mt-4">
            <SplashPanel rows={data.splash} refresh={load} />
          </TabsContent>
          <TabsContent value="demu" className="mt-4">
            <DemuPanel rows={data.demu} refresh={load} />
          </TabsContent>
          <TabsContent value="viewers" className="mt-4">
            <ViewersPanel count={data.viewers} refresh={load} />
          </TabsContent>
          <TabsContent value="ai" className="mt-4">
            <AiQuestionsPanel />
            <AiInfoPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await adminSignIn(username, password);
    setBusy(false);
    if (err) return setError(err);
    onSuccess();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card"
      >
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="size-5" />
          <h1 className="text-lg font-bold">Admin Dashboard</h1>
        </div>
        <div className="space-y-1">
          <Label htmlFor="u">အသုံးပြုသူအမည်</Label>
          <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p">စကားဝှက်</Label>
          <Input
            id="p"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          ဝင်ရောက်မည်
        </Button>
      </form>
    </div>
  );
}
