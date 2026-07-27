import { useMemo, useState } from "react";
import { ArrowRight, Search, Train as TrainIcon, X } from "lucide-react";
import type { Station, TrainWithStops } from "@/lib/data";
import { mmMoney, mmNum, mmTime } from "@/lib/mm";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Match = {
  train: TrainWithStops;
  from: TrainWithStops["stops"][number];
  to: TrainWithStops["stops"][number];
};

function fareBetween(a: number | null, b: number | null) {
  if (b === null || b === undefined) return null;
  return Math.max(0, b - (a ?? 0));
}

export function ScheduleSection({
  trains,
  stations,
}: {
  trains: TrainWithStops[];
  stations: Station[];
}) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [openTrain, setOpenTrain] = useState<string | null>(null);

  const matches = useMemo<Match[]>(() => {
    if (!from || !to || from === to) return [];
    const out: Match[] = [];
    for (const train of trains) {
      const f = train.stops.find((s) => s.station_name === from && s.stops);
      const t = train.stops.find((s) => s.station_name === to && s.stops);
      if (f && t && f.stop_order < t.stop_order) out.push({ train, from: f, to: t });
    }
    return out;
  }, [from, to, trains]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
          <Search className="size-4" /> ခရီးစဉ် ရှာဖွေရန်
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr]">
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="ထွက်ခွာဘူတာ" />
            </SelectTrigger>
            <SelectContent>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="hidden items-center justify-center text-muted-foreground sm:flex">
            <ArrowRight className="size-4" />
          </div>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="ဆိုက်ရောက်ဘူတာ" />
            </SelectTrigger>
            <SelectContent>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {from && to ? (
          <div className="mt-3 space-y-2">
            {matches.length === 0 ? (
              <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                ဤဘူတာနှစ်ခုကြား တိုက်ရိုက်ခရီးစဉ် မတွေ့ပါ။
              </p>
            ) : (
              matches.map(({ train, from: f, to: t }) => (
                <div
                  key={train.id}
                  className="rounded-xl border border-leaf/40 bg-leaf-soft/60 p-3 text-sm"
                >
                  <div className="font-bold text-secondary-foreground">{train.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      {f.station_name} <b>{mmTime(f.depart_time ?? f.arrive_time)}</b>
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    <span>
                      {t.station_name} <b>{mmTime(t.arrive_time ?? t.depart_time)}</b>
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                      ရိုးရိုး {mmMoney(fareBetween(f.fare_ordinary, t.fare_ordinary))}
                    </span>
                    {train.has_upper_class && t.fare_upper !== null ? (
                      <span className="rounded-full bg-sun/30 px-2 py-0.5 text-xs font-semibold text-sun-foreground">
                        အထက်တန်း {mmMoney(fareBetween(f.fare_upper, t.fare_upper))}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              <X className="size-4" /> ရှင်းလင်းရန်
            </Button>
          </div>
        ) : null}
      </div>

      {trains.map((train) => {
        const open = openTrain === train.id;
        return (
          <div key={train.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <button
              type="button"
              onClick={() => setOpenTrain(open ? null : train.id)}
              className="surface-header flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card/85 text-base font-bold text-primary">
                {mmNum(train.number)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-primary-foreground">
                  {train.name}
                </span>
                <span className="block truncate text-xs text-primary-foreground/85">
                  {train.origin} → {train.destination} · ထွက်ခွာ {mmTime(train.depart_time)}
                </span>
              </span>
              <TrainIcon className="size-5 shrink-0 text-primary-foreground" />
            </button>

            {open ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sky-soft text-[11px] uppercase text-primary">
                    <tr>
                      <th className="px-3 py-2">ဘူတာ</th>
                      <th className="px-2 py-2">ဆိုက်</th>
                      <th className="px-2 py-2">ထွက်</th>
                      <th className="px-2 py-2">ရိုးရိုး</th>
                      {train.has_upper_class ? <th className="px-2 py-2">အထက်</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {train.stops.map((stop, i) => (
                      <tr
                        key={stop.id}
                        className={
                          !stop.stops
                            ? "bg-muted/70 text-muted-foreground"
                            : i % 2 === 0
                              ? "bg-card"
                              : "bg-leaf-soft/40"
                        }
                      >
                        <td className="px-3 py-2 font-semibold">
                          <span className="mr-1 text-muted-foreground">{mmNum(i + 1)}။</span>
                          {stop.station_name}
                          {stop.note ? (
                            <span className="block text-[10px] font-normal text-muted-foreground">
                              {stop.note}
                            </span>
                          ) : null}
                        </td>
                        {stop.stops ? (
                          <>
                            <td className="px-2 py-2 whitespace-nowrap text-primary">
                              {mmTime(stop.arrive_time)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-secondary-foreground">
                              {mmTime(stop.depart_time)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap font-semibold">
                              {stop.fare_ordinary === null ? "—" : mmNum(stop.fare_ordinary.toLocaleString("en-US"))}
                            </td>
                            {train.has_upper_class ? (
                              <td className="px-2 py-2 whitespace-nowrap font-semibold text-sun-foreground">
                                {stop.fare_upper === null ? "—" : mmNum(stop.fare_upper.toLocaleString("en-US"))}
                              </td>
                            ) : null}
                          </>
                        ) : (
                          <td className="px-2 py-2" colSpan={train.has_upper_class ? 4 : 3}>
                            ရထား မရပ်ပါ
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
