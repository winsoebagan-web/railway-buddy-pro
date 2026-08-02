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
