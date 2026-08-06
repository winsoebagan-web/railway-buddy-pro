import { useEffect, useState } from "react";
import { Mail, Video } from "lucide-react";
import type { NoticeLetter, NoticeVideo } from "@/lib/data";
import { liveStyleClass } from "@/components/app/LiveBoard";
import { VideoEmbed } from "@/components/app/VideoEmbed";

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function minutesOf(t?: string | null) {
  if (!t) return -1;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

export function NoticeLetterSection({
  rows,
  videos,
}: {
  rows?: NoticeLetter[] | null;
  videos?: NoticeVideo[] | null;
}) {
  const [current, setCurrent] = useState(nowMinutes());
  useEffect(() => {
    const t = setInterval(() => setCurrent(nowMinutes()), 20_000);
    return () => clearInterval(t);
  }, []);

  const inWindow = (v: NoticeVideo) => {
    const s = minutesOf((v as { start_time?: string | null }).start_time);
    const e = minutesOf((v as { end_time?: string | null }).end_time);
    if (s < 0 && e < 0) return true;
    if (s >= 0 && e >= 0)
      return s <= e ? current >= s && current <= e : current >= s || current <= e;
    if (s >= 0) return current >= s;
    return current <= e;
  };

  const list = (rows ?? [])
    .filter((r) => r.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  const clips = (videos ?? [])
    .filter((v) => v.is_visible && v.url && inWindow(v))
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 5);

  if (list.length === 0 && clips.length === 0) return null;


  return (
    <div className="space-y-2">
      {list.map((n) => (
        <div
          key={n.id}
          className="overflow-hidden rounded-2xl border border-leaf/40 bg-leaf-soft/40 p-3"
        >
          <div className="mb-1 flex items-center gap-1.5 text-sm font-bold" style={{ color: n.color }}>
            <Mail className="size-4" />
            <span className={liveStyleClass(n.style)}>{n.title}</span>
          </div>
          <p
            className={`whitespace-pre-line text-sm font-medium ${liveStyleClass(n.style)}`}
            style={{ color: n.color }}
          >
            {n.body}
          </p>
        </div>
      ))}

      {clips.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {clips.map((v) => (
            <div
              key={v.id}
              className="overflow-hidden rounded-2xl border border-sky-500/30 bg-card p-2 shadow-card"
            >
              {v.title ? (
                <div className="mb-1 flex items-center gap-1.5 px-1 text-xs font-bold text-primary">
                  <Video className="size-3.5" />
                  <span className="truncate">{v.title}</span>
                </div>
              ) : null}
              <video
                controls
                playsInline
                preload="metadata"
                src={v.url}
                className="w-full rounded-xl bg-black"
              >
                <track kind="captions" />
              </video>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
