import { useMemo, useState } from "react";
import { TrainFront } from "lucide-react";
import type { DemuSchedule } from "@/lib/data";
import { mmMoney, mmNum, mmTime } from "@/lib/mm";

export const DEMU_CITIES = ["ရန်ကုန်", "မန္တလေး", "နေပြည်တော်", "မော်လမြိုင်", "ပြည်"] as const;

const CITY_STYLE: Record<string, string> = {
  "ရန်ကုန်": "bg-primary/15 text-primary",
  "မန္တလေး": "bg-leaf/30 text-secondary-foreground",
  "နေပြည်တော်": "bg-sun/30 text-sun-foreground",
  "မော်လမြိုင်": "bg-sky-soft text-primary",
  "ပြည်": "bg-leaf-soft text-secondary-foreground",
};

export function DemuSection({ rows }: { rows: DemuSchedule[] }) {
  const visible = useMemo(() => (rows ?? []).filter((r) => r.is_visible), [rows]);
  const cities = useMemo(() => {
    const found = Array.from(new Set(visible.map((r) => r.city)));
    const ordered = DEMU_CITIES.filter((c) => found.includes(c));
    return [...ordered, ...found.filter((c) => !DEMU_CITIES.includes(c as never))];
  }, [visible]);
  const [city, setCity] = useState<string | null>(null);
  const active = city && cities.includes(city) ? city : (cities[0] ?? null);
  const list = visible.filter((r) => r.city === active);

  if (visible.length === 0) {
    return (
      <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        DEMU ရထား အချက်အလက် မရှိသေးပါ။
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {cities.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCity(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              c === active
                ? "surface-header text-primary-foreground shadow-card"
                : CITY_STYLE[c] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="surface-header flex items-center gap-2 px-4 py-2.5">
          <TrainFront className="size-4 text-primary-foreground" />
          <span className="text-sm font-bold text-primary-foreground">
            {active} DEMU ခရီးစဉ်များ
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sky-soft text-[11px] uppercase text-primary">
              <tr>
                <th className="px-3 py-2">အမှတ်</th>
                <th className="px-2 py-2">လမ်းကြောင်း</th>
                <th className="px-2 py-2">ထွက်</th>
                <th className="px-2 py-2">ဆိုက်</th>
                <th className="px-2 py-2">ပထမတန်း</th>
                <th className="px-2 py-2">အထက်တန်း</th>

              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <DemuRow key={r.id} row={r} striped={i % 2 !== 0} />
              ))}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}

const STOP_COLORS = [
  "bg-primary/12 text-primary border-primary/30",
  "bg-leaf-soft text-secondary-foreground border-leaf",
  "bg-sun/25 text-sun-foreground border-sun/50",
  "bg-sky-soft text-primary border-primary/25",
];

function parseStops(note: string) {
  return note
    .split(/[·\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(.*?)[\s\u00a0]+([0-9၀-၉]{1,2}[:：][0-9၀-၉]{2})$/);
      return m ? { name: m[1].trim(), time: m[2] } : { name: chunk, time: "" };
    });
}

function DemuRow({ row, striped }: { row: DemuSchedule; striped: boolean }) {
  const [open, setOpen] = useState(false);
  const stops = useMemo(() => (row.note ? parseStops(row.note) : []), [row.note]);

  return (
    <>
      <tr className={striped ? "bg-leaf-soft/40" : "bg-card"}>
        <td className="px-3 py-2 font-bold text-primary whitespace-nowrap">{mmNum(row.train_no)}</td>
        <td className="px-2 py-2 font-semibold">
          <span className="block">{row.route}</span>
          {stops.length > 0 ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary transition active:scale-95"
            >
              <MapPin className="size-3" />
              ဘူတာ {mmNum(stops.length)} ခု
              <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </td>
        <td className="px-2 py-2 whitespace-nowrap text-primary">{mmTime(row.depart_time)}</td>
        <td className="px-2 py-2 whitespace-nowrap text-secondary-foreground">{mmTime(row.arrive_time)}</td>
        <td className="px-2 py-2 whitespace-nowrap font-semibold">
          {row.fare_ordinary === null ? "—" : mmMoney(row.fare_ordinary)}
        </td>
        <td className="px-2 py-2 whitespace-nowrap font-semibold text-sun-foreground">
          {row.fare_upper === null ? "—" : mmMoney(row.fare_upper)}
        </td>
      </tr>
      {open && stops.length > 0 ? (
        <tr className={striped ? "bg-leaf-soft/40" : "bg-card"}>
          <td colSpan={6} className="px-3 pb-3">
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {stops.map((s, i) => (
                <li
                  key={`${s.name}-${i}`}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${STOP_COLORS[i % STOP_COLORS.length]}`}
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-card/80 text-[10px] font-bold">
                    {mmNum(i + 1)}
                  </span>
                  <span className="flex-1 text-[11px] font-semibold leading-tight">{s.name}</span>
                  {s.time ? (
                    <span className="rounded-md bg-card/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
                      {mmTime(s.time)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </td>
        </tr>
      ) : null}
    </>
  );
}

