import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import type { AppNotification } from "@/lib/data";
import { mmRelative } from "@/lib/mm";
import { Button } from "@/components/ui/button";

const OFF_KEY = "notif-off";
const SEEN_KEY = "notif-dismissed";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function useNotifications(rows?: AppNotification[] | null) {
  const [off, setOff] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setOff(window.localStorage.getItem(OFF_KEY) === "1");
    setDismissed(readList(SEEN_KEY));
  }, []);

  function toggleOff() {
    const next = !off;
    setOff(next);
    window.localStorage.setItem(OFF_KEY, next ? "1" : "0");
  }

  function dismiss(id: string) {
    const next = [...new Set([...dismissed, id])];
    setDismissed(next);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  }

  const list = useMemo(() => {
    const now = Date.now();
    return (rows ?? [])
      .filter((n) => n.is_visible && new Date(n.send_at).getTime() <= now)
      .filter((n) => !dismissed.includes(n.id))
      .sort((a, b) => new Date(b.send_at).getTime() - new Date(a.send_at).getTime());
  }, [rows, dismissed]);

  return { off, toggleOff, dismiss, list };
}

function playBell() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => void ctx.close();
  } catch {
    /* ignore */
  }
}

export function NotificationsBanner({ rows }: { rows?: AppNotification[] | null }) {
  const { off, toggleOff, dismiss, list } = useNotifications(rows);
  const [open, setOpen] = useState<AppNotification | null>(null);
  const [ringing, setRinging] = useState(false);

  // နိုတီအသစ်ရောက်ရင် messenger လို ခေါင်းလောင်းတုန်ပြီး အသံမြည်စေမည်
  useEffect(() => {
    if (off || list.length === 0) return;
    const latest = list[0];
    if (typeof window === "undefined") return;
    const lastId = window.localStorage.getItem("notif-last-id");
    if (lastId === latest.id) return;
    window.localStorage.setItem("notif-last-id", latest.id);
    setRinging(true);
    playBell();
    const t = window.setTimeout(() => setRinging(false), 4000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length > 0 ? list[0]?.id : null, off]);

  if (off) return null;

  return (
    <>
      <style>{`
        @keyframes bell-shake {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(18deg); }
          30% { transform: rotate(-15deg); }
          45% { transform: rotate(12deg); }
          60% { transform: rotate(-9deg); }
          75% { transform: rotate(5deg); }
        }
        .bell-ring { animation: bell-shake 0.6s ease-in-out infinite; transform-origin: top center; }
      `}</style>
      <div className="pointer-events-none fixed left-0 right-0 top-[4.25rem] z-40 space-y-2 px-3 sm:top-20">
        {list.length > 0 ? (
          <div className="mx-auto flex w-full max-w-2xl justify-end">
            <button
              type="button"
              onClick={toggleOff}
              className="pointer-events-auto flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-card backdrop-blur hover:text-foreground"
            >
              <BellOff className="size-3.5" /> နိုတီ ပိတ်ရန်
            </button>
          </div>
        ) : null}
        {list.slice(0, 3).map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setOpen(n)}
            className="pointer-events-auto mx-auto flex w-full max-w-2xl items-start gap-3 rounded-2xl border border-primary/30 bg-card/95 p-3 text-left shadow-card backdrop-blur animate-in slide-in-from-top-3 fade-in duration-300"
          >
            <span className={`relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ${ringing ? "pulse" : ""}`}>
              <Bell className={`size-5 ${ringing ? "bell-ring" : ""}`} />
              {ringing ? (
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-card" />
              ) : null}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-1 text-sm font-bold text-primary">
                  {n.title || "နိုတီ"}
                </span>
                <span className="text-[11px] whitespace-nowrap text-muted-foreground">
                  {mmRelative(n.send_at)}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-foreground/90">{n.message}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismiss(n.id);
              }}
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="ပိတ်မည်"
            >
              <X className="size-4" />
            </button>
          </button>
        ))}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-4 shadow-card"
            style={{ WebkitOverflowScrolling: "touch" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bell className="size-4" />
                </span>
                <h3 className="text-base font-bold text-primary">{open.title || "နိုတီ"}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(null)}>
                <X className="size-4" />
              </Button>
            </div>
            {open.image_url ? (
              <img
                src={open.image_url}
                alt={open.title || "နိုတီ ဓာတ်ပုံ"}
                className="mb-2 w-full rounded-xl object-contain"
              />
            ) : null}
            <p className="whitespace-pre-wrap text-sm">{open.message}</p>
            <div className="mt-2 text-[11px] text-muted-foreground">{mmRelative(open.send_at)}</div>
            <Button className="mt-3 w-full" variant="outline" onClick={() => { dismiss(open.id); setOpen(null); }}>
              ဖတ်ပြီးပါပြီ
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function NotificationsSection({ rows }: { rows?: AppNotification[] | null }) {
  const { off, toggleOff, dismiss, list } = useNotifications(rows);
  const [open, setOpen] = useState<AppNotification | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <span className="flex items-center gap-1.5 text-sm font-bold text-primary">
          {off ? <BellOff className="size-4" /> : <Bell className="size-4" />}
          နိုတီများ
        </span>
        <Button variant={off ? "outline" : "default"} size="sm" onClick={toggleOff}>
          {off ? "ပြန်ဖွင့်မည်" : "ပိတ်ထားမည်"}
        </Button>
      </div>

      {off ? (
        <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          နိုတီများကို ပိတ်ထားပါသည်။
        </p>
      ) : list.length === 0 ? (
        <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          နိုတီ အသစ် မရှိသေးပါ။
        </p>
      ) : (
        list.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setOpen(n)}
            className="w-full overflow-hidden rounded-2xl border border-primary/25 bg-sky-soft/60 p-3 text-left shadow-card"
          >
            <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <Bell className="size-4" /> {n.title || "နိုတီ"}
            </div>
            {n.image_url ? (
              <img
                src={n.image_url}
                alt={n.title || "နိုတီ ဓာတ်ပုံ"}
                loading="lazy"
                className="mt-2 max-h-44 w-full rounded-xl object-cover"
              />
            ) : null}
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs">{n.message}</p>
            <div className="mt-1 text-[11px] text-muted-foreground">{mmRelative(n.send_at)}</div>
          </button>
        ))
      )}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-4 shadow-card"
            style={{ WebkitOverflowScrolling: "touch" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-primary">{open.title || "နိုတီ"}</h3>
              <Button variant="ghost" size="icon" onClick={() => setOpen(null)}>
                <X className="size-4" />
              </Button>
            </div>
            {open.image_url ? (
              <img
                src={open.image_url}
                alt={open.title || "နိုတီ ဓာတ်ပုံ"}
                className="mb-2 w-full rounded-xl object-contain"
              />
            ) : null}
            <p className="whitespace-pre-wrap text-sm">{open.message}</p>
            <div className="mt-2 text-[11px] text-muted-foreground">{mmRelative(open.send_at)}</div>
            <Button className="mt-3 w-full" variant="outline" onClick={() => { dismiss(open.id); setOpen(null); }}>
              ဖတ်ပြီးပါပြီ
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
