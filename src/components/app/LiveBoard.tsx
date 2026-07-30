import { useEffect, useMemo, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import type { LiveBoardSettings, LiveNotice, TrainWithStops } from "@/lib/data";
import { mmNum, mmTime, minutesOf } from "@/lib/mm";

export type LiveStyle = "plain" | "marquee" | "blink";

export function liveStyleClass(style: string): string {
  if (style === "marquee") return "animate-marquee whitespace-nowrap";
  if (style === "blink") return "animate-blink";
  return "";
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

type AutoItem = { key: string; text: string; soon: boolean };

function buildAuto(trains: TrainWithStops[], lead: number, current: number): AutoItem[] {
  const out: AutoItem[] = [];
  for (const train of trains) {
    const stops = train.stops.filter((s) => s.stops);
    for (const stop of stops) {
      const dep = minutesOf(stop.depart_time);
      const arr = minutesOf(stop.arrive_time);
      if (dep >= 0 && current >= dep - lead && current <= dep) {
        out.push({
          key: `${stop.id}-d`,
          text: `အမှတ် ${mmNum(train.number)} ${train.name} — ${stop.station_name} မှ ${mmTime(stop.depart_time)} တွင် ထွက်တော့မည်`,
          soon: true,
        });
      } else if (arr >= 0 && current >= arr - lead && current <= arr) {
        out.push({
          key: `${stop.id}-a`,
          text: `အမှတ် ${mmNum(train.number)} ${train.name} — ${stop.station_name} သို့ ${mmTime(stop.arrive_time)} တွင် ဆိုက်ရောက်တော့မည်`,
          soon: true,
        });
      }
    }
    // next upcoming stop for context
    const next = stops.find((s) => minutesOf(s.depart_time ?? s.arrive_time) >= current);
    if (next) {
      out.push({
        key: `${next.id}-n`,
        text: `အမှတ် ${mmNum(train.number)} — နောက်ဆုံးဘူတာ ${next.station_name} · ဆိုက် ${mmTime(next.arrive_time)} / ထွက် ${mmTime(next.depart_time)}`,
        soon: false,
      });
    }
  }
  return out;
}

function useChime(url: string | null | undefined, trigger: string) {
  const ref = useRef<string>("");
  useEffect(() => {
    if (!url || !trigger || ref.current === trigger) return;
    ref.current = trigger;
    const audio = new Audio(url);
    audio.play().catch(() => undefined);
  }, [url, trigger]);
}

export function LiveBoard({
  trains,
  notices,
  settings,
}: {
  trains: TrainWithStops[];
  notices: LiveNotice[];
  settings: LiveBoardSettings | null;
}) {
  const [current, setCurrent] = useState(() => nowMinutes());

  useEffect(() => {
    const t = setInterval(() => setCurrent(nowMinutes()), 20_000);
    return () => clearInterval(t);
  }, []);

  const lead = settings?.lead_minutes ?? 1;
  const auto = useMemo(
    () => (settings?.auto_enabled ? buildAuto(trains, lead, current) : []),
    [trains, lead, current, settings?.auto_enabled],
  );
  const soon = auto.filter((a) => a.soon);
  const rows = notices.filter((n) => n.is_visible).sort((a, b) => a.sort_order - b.sort_order);

  useChime(settings?.sound_url, soon.map((s) => s.key).join(","));
  useChime(rows[0]?.sound_url, rows[0]?.id ?? "");

  if (rows.length === 0 && auto.length === 0) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-leaf/40 bg-leaf-soft/50 p-3">
      <div className="flex items-center gap-2 text-sm font-bold text-primary">
        <Megaphone className="size-4" /> တပြေးညီ အသိပေးဘုတ်
      </div>

      {rows.map((n) => (
        <div key={n.id} className="overflow-hidden rounded-xl bg-card/85 px-3 py-2">
          <p
            className={`text-sm font-semibold ${liveStyleClass(n.style)}`}
            style={{ color: n.color }}
          >
            {n.message}
          </p>
        </div>
      ))}

      {auto.map((a) => (
        <div key={a.key} className="overflow-hidden rounded-xl bg-card/85 px-3 py-2">
          <p
            className={`text-sm font-semibold ${a.soon ? liveStyleClass(settings?.style ?? "plain") : ""}`}
            style={{ color: a.soon ? (settings?.color ?? "#0284c7") : undefined }}
          >
            {a.text}
          </p>
        </div>
      ))}
    </div>
  );
}
