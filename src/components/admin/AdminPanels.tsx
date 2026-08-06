import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/admin-auth";
import type {
  Audio,
  LiveBoardSettings,
  LiveNotice,
  Marquee,
  Post,
  Report,
  NoticeLetter,
  NoticeVideo,
  Section,
  SplashSlide,
  Station,
  Suggestion,
  DemuSchedule,
  TrainStop,
  TrainWithStops,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Row = Record<string, unknown>;
type TableName =
  | "stations"
  | "trains"
  | "train_stops"
  | "posts"
  | "reports"
  | "suggestions"
  | "audios"
  | "marquees"
  | "splash_slides"
  | "sections"
  | "live_notices"
  | "notice_letters"
  | "notice_videos"
  | "demu_schedules";

export async function saveRow(table: TableName, id: string, patch: Row, onDone: () => void) {
  const { error } = await supabase.from(table).update(patch as never).eq("id", id);
  if (error) return toast.error(error.message);
  toast.success("သိမ်းဆည်းပြီးပါပြီ။");
  onDone();
}

export async function insertRow(table: TableName, values: Row, onDone: () => void) {
  const { error } = await supabase.from(table).insert(values as never);
  if (error) return toast.error(error.message);
  toast.success("ထည့်သွင်းပြီးပါပြီ။");
  onDone();
}


export async function deleteRow(table: TableName, id: string, onDone: () => void) {
  if (!window.confirm("ဖျက်ရန် သေချာပါသလား။")) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return toast.error(error.message);
  toast.success("ဖျက်ပြီးပါပြီ။");
  onDone();
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 rounded-xl border border-border bg-card p-3">{children}</div>;
}

/* ---------------------------------------------- train departure time shift */

function toMin(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

function toHHMM(mins: number): string {
  const v = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

/** ပင်မဘူတာ ထွက်ခွာချိန် (ပထမဆုံး ရပ်တန့်ချက်) */
export function originDepart(train: TrainWithStops): string {
  const first = [...(train.stops ?? [])].sort((a, b) => a.stop_order - b.stop_order)[0];
  return first?.depart_time ?? first?.arrive_time ?? "";
}

/** ထွက်ခွာချိန် ပြောင်းလိုက်လျှင် ကြားဘူတာအားလုံးကို အချိုးကျ ရွှေ့ပေးသည် */
export async function shiftTrainTimes(
  train: TrainWithStops,
  newDepart: string,
  onDone: () => void,
) {
  const base = toMin(originDepart(train));
  const target = toMin(newDepart);
  if (base === null || target === null) {
    toast.error("ပင်မဘူတာ ထွက်ခွာချိန် မရှိပါ။");
    return;
  }
  const delta = target - base;
  if (delta === 0) return;

  const updates = (train.stops ?? []).map((s) => {
    const patch: Row = {};
    const a = toMin(s.arrive_time);
    const d = toMin(s.depart_time);
    if (a !== null) patch.arrive_time = toHHMM(a + delta);
    if (d !== null) patch.depart_time = toHHMM(d + delta);
    return { id: s.id, patch };
  });

  for (const u of updates) {
    if (Object.keys(u.patch).length === 0) continue;
    const { error } = await supabase
      .from("train_stops")
      .update(u.patch as never)
      .eq("id", u.id);
    if (error) return toast.error(error.message);
  }
  toast.success("ကြားဘူတာအချိန်များ အလိုအလျောက် ပြောင်းပြီးပါပြီ။");
  onDone();
}

/** ပင်မဘူတာ ထွက်ခွာချိန် ပြောင်းမည့် Before/After preview */
function DepartureShiftEditor({
  train,
  refresh,
}: {
  train: TrainWithStops;
  refresh: () => void;
}) {
  const current = originDepart(train);
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);

  const base = toMin(current);
  const target = toMin(value);
  const delta = base !== null && target !== null ? target - base : 0;
  const stops = [...(train.stops ?? [])].sort((a, b) => a.stop_order - b.stop_order);
  const dirty = value !== "" && value !== current && delta !== 0;

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-2">
      <Label className="text-xs">
        အမှတ် {train.number || train.name} — ပင်မဘူတာ ထွက်ခွာချိန်
      </Label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Input
          key={`${train.id}-${current}`}
          className="h-9 w-36"
          type="time"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <span className="text-[11px] text-muted-foreground">
          ပြောင်းလိုက်လျှင် ကြားဘူတာ ဆိုက်/ထွက်ချိန်များ အချိုးကျ auto ရွှေ့ပါမည်။
        </span>
      </div>

      {dirty ? (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] font-semibold text-primary">
            ကြိုတင်ကြည့်ရှုမှု (မသိမ်းရသေးပါ) — ရွှေ့မည့်အချိန် {delta > 0 ? "+" : ""}
            {delta} မိနစ်
          </p>
          <div className="max-h-60 overflow-y-auto rounded-md border border-border bg-background">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="p-1 text-left">ဘူတာ</th>
                  <th className="p-1">ယခု (ဆိုက်/ထွက်)</th>
                  <th className="p-1">ပြောင်းပြီး (ဆိုက်/ထွက်)</th>
                </tr>
              </thead>
              <tbody>
                {stops.map((s) => {
                  const a = toMin(s.arrive_time);
                  const d = toMin(s.depart_time);
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="p-1">{s.station_name}</td>
                      <td className="p-1 text-center text-muted-foreground line-through">
                        {s.arrive_time ?? "—"} / {s.depart_time ?? "—"}
                      </td>
                      <td className="p-1 text-center font-semibold text-primary">
                        {a !== null ? toHHMM(a + delta) : "—"} /{" "}
                        {d !== null ? toHHMM(d + delta) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await shiftTrainTimes(train, value, refresh);
                setBusy(false);
              }}
            >
              အတည်ပြု သိမ်းမည်
            </Button>
            <Button size="sm" variant="outline" onClick={() => setValue(current)}>
              ပယ်ဖျက်
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


function VisibilityToggle({
  value,
  onChange,
  label = "ပြမည်",
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium">
      <Switch checked={value} onCheckedChange={onChange} />
      {value ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />} {label}
    </label>
  );
}

/* ---------------------------------------------------------------- sections */

export function SectionsPanel({ rows, refresh }: { rows: Section[]; refresh: () => void }) {
  async function move(row: Section, dir: -1 | 1) {
    const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((r) => r.id === row.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    await supabase.from("sections").update({ sort_order: sorted[j].sort_order }).eq("id", row.id);
    await supabase.from("sections").update({ sort_order: row.sort_order }).eq("id", sorted[j].id);
    refresh();
  }

  return (
    <div className="space-y-2">
      {[...rows]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => (
          <Card key={row.id}>
            <div className="flex items-center gap-2">
              <Input
                defaultValue={row.label}
                onBlur={(e) => {
                  if (e.target.value !== row.label)
                    saveRow("sections", row.id, { label: e.target.value }, refresh);
                }}
              />
              <Button size="icon" variant="outline" onClick={() => move(row, -1)}>
                <ArrowUp className="size-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => move(row, 1)}>
                <ArrowDown className="size-4" />
              </Button>
            </div>
            <VisibilityToggle
              value={row.is_visible}
              onChange={(v) => saveRow("sections", row.id, { is_visible: v }, refresh)}
            />
          </Card>
        ))}
    </div>
  );
}

/* ---------------------------------------------------------------- stations */

export function StationsPanel({ rows, refresh }: { rows: Station[]; refresh: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-2">
      <Card>
        <Label>ဘူတာအသစ်</Label>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ဘူတာအမည်" />
          <Button
            onClick={() => {
              if (!name.trim()) return;
              insertRow("stations", { name: name.trim(), sort_order: rows.length + 1 }, refresh);
              setName("");
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </Card>
      {rows.map((row) => (
        <Card key={row.id}>
          <div className="flex gap-2">
            <Input
              defaultValue={row.name}
              onBlur={(e) =>
                e.target.value !== row.name &&
                saveRow("stations", row.id, { name: e.target.value }, refresh)
              }
            />
            <Input
              type="number"
              className="w-20"
              defaultValue={row.sort_order}
              onBlur={(e) => saveRow("stations", row.id, { sort_order: Number(e.target.value) }, refresh)}
            />
            <Button variant="destructive" size="icon" onClick={() => deleteRow("stations", row.id, refresh)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ trains */

export function TrainsPanel({
  rows,
  stations,
  refresh,
}: {
  rows: TrainWithStops[];
  stations: Station[];
  refresh: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ number: "", name: "", origin: "", destination: "" });

  return (
    <div className="space-y-2">
      <Card>
        <Label>ရထားခရီးစဉ်အသစ်</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="အမှတ်"
            value={draft.number}
            onChange={(e) => setDraft({ ...draft, number: e.target.value })}
          />
          <Input
            placeholder="အမည်"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            placeholder="ထွက်ခွာဘူတာ"
            value={draft.origin}
            onChange={(e) => setDraft({ ...draft, origin: e.target.value })}
          />
          <Input
            placeholder="ဆိုက်ရောက်ဘူတာ"
            value={draft.destination}
            onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
          />
        </div>
        <Button
          className="w-full"
          onClick={() => {
            if (!draft.name.trim()) return;
            insertRow("trains", { ...draft, sort_order: rows.length + 1 }, refresh);
            setDraft({ number: "", name: "", origin: "", destination: "" });
          }}
        >
          <Plus className="size-4" /> ထည့်မည်
        </Button>
      </Card>

      {rows.map((train) => (
        <Card key={train.id}>
          <div className="flex items-center gap-2">
            <Input
              defaultValue={train.name}
              onBlur={(e) =>
                e.target.value !== train.name &&
                saveRow("trains", train.id, { name: e.target.value }, refresh)
              }
            />
            <Button variant="outline" size="sm" onClick={() => setOpen(open === train.id ? null : train.id)}>
              ဘူတာများ
            </Button>
            <Button variant="destructive" size="icon" onClick={() => deleteRow("trains", train.id, refresh)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <VisibilityToggle
              value={train.is_visible}
              onChange={(v) => saveRow("trains", train.id, { is_visible: v }, refresh)}
            />
            <label className="flex items-center gap-2 text-xs font-medium">
              <Switch
                checked={train.has_upper_class}
                onCheckedChange={(v) => saveRow("trains", train.id, { has_upper_class: v }, refresh)}
              />
              အထက်တန်း
            </label>
            <Input
              className="w-24"
              type="number"
              defaultValue={train.sort_order}
              onBlur={(e) => saveRow("trains", train.id, { sort_order: Number(e.target.value) }, refresh)}
            />
          </div>

          <DepartureShiftEditor train={train} refresh={refresh} />




          {open === train.id ? (
            <StopsEditor train={train} stations={stations} refresh={refresh} />
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function StopsEditor({
  train,
  stations,
  refresh,
}: {
  train: TrainWithStops;
  stations: Station[];
  refresh: () => void;
}) {
  const [station, setStation] = useState("");
  return (
    <div className="space-y-2 rounded-lg bg-muted/60 p-2">
      {train.stops.map((stop: TrainStop) => (
        <div key={stop.id} className="grid grid-cols-6 items-center gap-1 text-xs">
          <Input
            className="col-span-2 h-8"
            defaultValue={stop.station_name}
            onBlur={(e) => saveRow("train_stops", stop.id, { station_name: e.target.value }, refresh)}
          />
          <Input
            className="h-8"
            type="time"
            defaultValue={stop.arrive_time ?? ""}
            onBlur={(e) =>
              saveRow("train_stops", stop.id, { arrive_time: e.target.value || null }, refresh)
            }
          />
          <Input
            className="h-8"
            type="time"
            defaultValue={stop.depart_time ?? ""}
            onBlur={(e) =>
              saveRow("train_stops", stop.id, { depart_time: e.target.value || null }, refresh)
            }
          />
          <Input
            className="h-8"
            type="number"
            placeholder="ရိုးရိုး"
            defaultValue={stop.fare_ordinary ?? ""}
            onBlur={(e) =>
              saveRow(
                "train_stops",
                stop.id,
                { fare_ordinary: e.target.value === "" ? null : Number(e.target.value) },
                refresh,
              )
            }
          />
          <div className="flex items-center gap-1">
            <Input
              className="h-8"
              type="number"
              placeholder="အထက်"
              defaultValue={stop.fare_upper ?? ""}
              onBlur={(e) =>
                saveRow(
                  "train_stops",
                  stop.id,
                  { fare_upper: e.target.value === "" ? null : Number(e.target.value) },
                  refresh,
                )
              }
            />
            <Button
              size="icon"
              variant="destructive"
              className="size-8 shrink-0"
              onClick={() => deleteRow("train_stops", stop.id, refresh)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <select
          className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-xs"
          value={station}
          onChange={(e) => setStation(e.target.value)}
        >
          <option value="">ဘူတာရွေးပါ</option>
          {stations.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={() => {
            if (!station) return;
            insertRow(
              "train_stops",
              {
                train_id: train.id,
                station_name: station,
                stop_order: train.stops.length + 1,
                stops: true,
              },
              refresh,
            );
            setStation("");
          }}
        >
          <Plus className="size-4" /> ဘူတာထည့်
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- posts */

export function PostsPanel({ rows, refresh }: { rows: Post[]; refresh: () => void }) {
  const [draft, setDraft] = useState({
    title: "",
    body: "",
    image_url: "",
    facebook_url: "",
    tiktok_url: "",
    website_url: "",
    facebook_label: "",
    tiktok_label: "",
    website_label: "",
    link_color: "#1d4ed8",
    is_pinned: false,
  });
  const [busy, setBusy] = useState(false);

  async function pickImage(file: File, apply: (url: string) => void) {
    setBusy(true);
    try {
      apply(await uploadMedia(file, "posts"));
      toast.success("ပုံတင်ပြီးပါပြီ။");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Card>
        <Label>ပို့စ်အသစ် — လင့်ခ်များ (ပို့စ်ထိပ်တွင် ပြပါမည်)</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Facebook URL"
            value={draft.facebook_url}
            onChange={(e) => setDraft({ ...draft, facebook_url: e.target.value })}
          />
          <Input
            placeholder="Facebook စာသား"
            value={draft.facebook_label}
            onChange={(e) => setDraft({ ...draft, facebook_label: e.target.value })}
          />
          <Input
            placeholder="TikTok URL"
            value={draft.tiktok_url}
            onChange={(e) => setDraft({ ...draft, tiktok_url: e.target.value })}
          />
          <Input
            placeholder="TikTok စာသား"
            value={draft.tiktok_label}
            onChange={(e) => setDraft({ ...draft, tiktok_label: e.target.value })}
          />
          <Input
            placeholder="Website URL"
            value={draft.website_url}
            onChange={(e) => setDraft({ ...draft, website_url: e.target.value })}
          />
          <Input
            placeholder="Website စာသား"
            value={draft.website_label}
            onChange={(e) => setDraft({ ...draft, website_label: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-medium">
          စာသားအရောင်
          <input
            type="color"
            value={draft.link_color}
            onChange={(e) => setDraft({ ...draft, link_color: e.target.value })}
            className="h-8 w-12 rounded border border-border"
          />
        </label>

        <Input
          placeholder="ခေါင်းစဉ်"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <Textarea
          rows={5}
          maxLength={2000}
          placeholder="အကြောင်းအရာ (၂၀၀၀ လုံးအထိ)"
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        />
        <div className="text-right text-[11px] text-muted-foreground">{draft.body.length}/2000</div>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickImage(f, (url) => setDraft((d) => ({ ...d, image_url: url })));
            }}
          />
          {draft.image_url ? <Upload className="size-4 text-secondary-foreground" /> : null}
        </div>
        <label className="flex items-center gap-2 text-xs font-medium">
          <Switch
            checked={draft.is_pinned}
            onCheckedChange={(v) => setDraft({ ...draft, is_pinned: v })}
          />
          အမြဲပြထားမည် (auto မဖျက်ပါ)
        </label>
        <Button
          className="w-full"
          onClick={() => {
            if (!draft.title.trim() && !draft.body.trim()) return;
            insertRow(
              "posts",
              {
                title: draft.title,
                body: draft.body.slice(0, 2000),
                image_url: draft.image_url || null,
                facebook_url: draft.facebook_url || null,
                tiktok_url: draft.tiktok_url || null,
                website_url: draft.website_url || null,
                facebook_label: draft.facebook_label || null,
                tiktok_label: draft.tiktok_label || null,
                website_label: draft.website_label || null,
                link_color: draft.link_color || null,
                is_pinned: draft.is_pinned,
              },
              refresh,
            );
            setDraft({
              title: "",
              body: "",
              image_url: "",
              facebook_url: "",
              tiktok_url: "",
              website_url: "",
              facebook_label: "",
              tiktok_label: "",
              website_label: "",
              link_color: "#1d4ed8",
              is_pinned: false,
            });
          }}
        >
          <Plus className="size-4" /> တင်မည်
        </Button>
      </Card>


      {rows.map((row) => (
        <Card key={row.id}>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Facebook URL"
              defaultValue={row.facebook_url ?? ""}
              onBlur={(e) =>
                saveRow("posts", row.id, { facebook_url: e.target.value || null }, refresh)
              }
            />
            <Input
              placeholder="Facebook စာသား"
              defaultValue={row.facebook_label ?? ""}
              onBlur={(e) =>
                saveRow("posts", row.id, { facebook_label: e.target.value || null }, refresh)
              }
            />
            <Input
              placeholder="TikTok URL"
              defaultValue={row.tiktok_url ?? ""}
              onBlur={(e) =>
                saveRow("posts", row.id, { tiktok_url: e.target.value || null }, refresh)
              }
            />
            <Input
              placeholder="TikTok စာသား"
              defaultValue={row.tiktok_label ?? ""}
              onBlur={(e) =>
                saveRow("posts", row.id, { tiktok_label: e.target.value || null }, refresh)
              }
            />
            <Input
              placeholder="Website URL"
              defaultValue={row.website_url ?? ""}
              onBlur={(e) =>
                saveRow("posts", row.id, { website_url: e.target.value || null }, refresh)
              }
            />
            <Input
              placeholder="Website စာသား"
              defaultValue={row.website_label ?? ""}
              onBlur={(e) =>
                saveRow("posts", row.id, { website_label: e.target.value || null }, refresh)
              }
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium">
            စာသားအရောင်
            <input
              type="color"
              defaultValue={row.link_color ?? "#1d4ed8"}
              onBlur={(e) => saveRow("posts", row.id, { link_color: e.target.value }, refresh)}
              className="h-8 w-12 rounded border border-border"
            />
          </label>
          <Input
            defaultValue={row.title}
            onBlur={(e) => saveRow("posts", row.id, { title: e.target.value }, refresh)}
          />

          <Textarea
            rows={3}
            maxLength={2000}
            defaultValue={row.body}
            onBlur={(e) => saveRow("posts", row.id, { body: e.target.value.slice(0, 2000) }, refresh)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <VisibilityToggle
              value={row.is_visible}
              onChange={(v) => saveRow("posts", row.id, { is_visible: v }, refresh)}
            />
            <label className="flex items-center gap-2 text-xs font-medium">
              <Switch
                checked={row.is_pinned}
                onCheckedChange={(v) => saveRow("posts", row.id, { is_pinned: v }, refresh)}
              />
              အမြဲပြ
            </label>
            <Button
              variant="destructive"
              size="icon"
              className="ml-auto"
              onClick={() => deleteRow("posts", row.id, refresh)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- notice letters */

const LETTER_STYLES = [
  { value: "plain", label: "ရိုးရိုး" },
  { value: "marquee", label: "စာတန်းပြေး" },
  { value: "blink", label: "မိတ်တုတ်မိတ်တုတ်" },
];

export function NoticeLettersPanel({
  rows,
  refresh,
}: {
  rows: NoticeLetter[];
  refresh: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function add() {
    if (!title.trim() && !body.trim()) return toast.error("ခေါင်းစဉ် သို့ အကြောင်းအရာ ထည့်ပါ။");
    await insertRow(
      "notice_letters",
      {
        title: title.trim(),
        body: body.slice(0, 300),
        style: "plain",
        color: "#0284c7",
        is_visible: true,
        sort_order: rows.length,
      },
      refresh,
    );
    setTitle("");
    setBody("");
  }

  return (
    <div className="space-y-3">
      <Card>
        <Label>အသိပေးစာ အသစ်</Label>
        <Input placeholder="ခေါင်းစဉ်" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          rows={3}
          maxLength={300}
          placeholder="အကြောင်းအရာ (စာလုံး ၃၀၀)"
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 300))}
        />
        <p className="text-[11px] text-muted-foreground">{body.length}/300</p>
        <Button onClick={add}>
          <Plus className="size-4" /> ထည့်မည်
        </Button>
      </Card>

      {rows
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => (
          <Card key={row.id}>
            <Input
              defaultValue={row.title}
              placeholder="ခေါင်းစဉ်"
              onBlur={(e) => saveRow("notice_letters", row.id, { title: e.target.value }, refresh)}
            />
            <Textarea
              rows={3}
              maxLength={300}
              defaultValue={row.body}
              placeholder="အကြောင်းအရာ (စာလုံး ၃၀၀)"
              onBlur={(e) =>
                saveRow("notice_letters", row.id, { body: e.target.value.slice(0, 300) }, refresh)
              }
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                defaultValue={row.style}
                onChange={(e) =>
                  saveRow("notice_letters", row.id, { style: e.target.value }, refresh)
                }
              >
                {LETTER_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Input
                type="color"
                defaultValue={row.color}
                onBlur={(e) => saveRow("notice_letters", row.id, { color: e.target.value }, refresh)}
              />
              <Input
                type="number"
                defaultValue={row.sort_order}
                onBlur={(e) =>
                  saveRow(
                    "notice_letters",
                    row.id,
                    { sort_order: Number(e.target.value) },
                    refresh,
                  )
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <VisibilityToggle
                value={row.is_visible}
                onChange={(v) => saveRow("notice_letters", row.id, { is_visible: v }, refresh)}
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={() => deleteRow("notice_letters", row.id, refresh)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
    </div>
  );
}

export function NoticeVideosPanel({ rows, refresh }: { rows: NoticeVideo[]; refresh: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (rows.length >= 5) return toast.error("အများဆုံး ၅ ခုသာ တင်နိုင်ပါသည်။");
    setBusy(true);
    try {
      const url = await uploadMedia(file, "video");
      await insertRow(
        "notice_videos",
        { title: title || file.name, url, sort_order: rows.length + 1 },
        refresh,
      );
      setTitle("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Card>
        <Label>ဗီဒီယို အသစ် ({rows.length}/5) — ၁၀ စက္ကန့်ခန့်</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ခေါင်းစဉ်" />
        <Input
          type="file"
          accept="video/*"
          disabled={busy || rows.length >= 5}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <p className="text-[11px] text-muted-foreground">
          သို့မဟုတ် ဗီဒီယို URL တိုက်ရိုက် ထည့်နိုင်ပါသည်။
        </p>
        <Button
          variant="outline"
          disabled={rows.length >= 5}
          onClick={() => {
            const url = window.prompt("ဗီဒီယို URL");
            if (!url) return;
            insertRow(
              "notice_videos",
              { title: title || "ဗီဒီယို", url, sort_order: rows.length + 1 },
              refresh,
            );
            setTitle("");
          }}
        >
          <Plus className="size-4" /> URL ဖြင့် ထည့်မည်
        </Button>
      </Card>

      {rows
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => (
          <Card key={row.id}>
            <div className="flex gap-2">
              <Input
                defaultValue={row.title ?? ""}
                placeholder="ခေါင်းစဉ်"
                onBlur={(e) => saveRow("notice_videos", row.id, { title: e.target.value }, refresh)}
              />
              <Input
                type="number"
                className="w-20"
                defaultValue={row.sort_order}
                onBlur={(e) =>
                  saveRow("notice_videos", row.id, { sort_order: Number(e.target.value) }, refresh)
                }
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={() => deleteRow("notice_videos", row.id, refresh)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Input
              defaultValue={row.url}
              placeholder="URL (YouTube / Facebook / TikTok / mp4)"
              onBlur={(e) => saveRow("notice_videos", row.id, { url: e.target.value.trim() }, refresh)}
            />
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-[11px]">စတင်ချိန်</Label>
                <Input
                  type="time"
                  defaultValue={(row as { start_time?: string | null }).start_time?.slice(0, 5) ?? ""}
                  onBlur={(e) =>
                    saveRow("notice_videos", row.id, { start_time: e.target.value || null }, refresh)
                  }
                />
              </div>
              <div className="flex-1">
                <Label className="text-[11px]">ပြီးဆုံးချိန်</Label>
                <Input
                  type="time"
                  defaultValue={(row as { end_time?: string | null }).end_time?.slice(0, 5) ?? ""}
                  onBlur={(e) =>
                    saveRow("notice_videos", row.id, { end_time: e.target.value || null }, refresh)
                  }
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              အချိန်မထည့်ရင် တစ်နေကုန် ပြပါမည်။
            </p>
            <VisibilityToggle
              value={row.is_visible}
              onChange={(v) => saveRow("notice_videos", row.id, { is_visible: v }, refresh)}
            />
            <VideoEmbed url={row.url} title={row.title ?? undefined} />

          </Card>
        ))}
    </div>
  );
}

/* ------------------------------------------------- reports and suggestions */

export function ReportsPanel({ rows, refresh }: { rows: Report[]; refresh: () => void }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <Card key={row.id}>
          <div className="grid grid-cols-2 gap-2">
            <Input
              defaultValue={row.station_name}
              onBlur={(e) => saveRow("reports", row.id, { station_name: e.target.value }, refresh)}
            />
            <Input
              defaultValue={row.train_name}
              onBlur={(e) => saveRow("reports", row.id, { train_name: e.target.value }, refresh)}
            />
            <Input
              type="time"
              defaultValue={row.report_time ?? ""}
              onBlur={(e) =>
                saveRow("reports", row.id, { report_time: e.target.value || null }, refresh)
              }
            />
            <Button variant="destructive" onClick={() => deleteRow("reports", row.id, refresh)}>
              <Trash2 className="size-4" /> ဖျက်မည်
            </Button>
          </div>
          <Textarea
            rows={2}
            defaultValue={row.note ?? ""}
            onBlur={(e) => saveRow("reports", row.id, { note: e.target.value || null }, refresh)}
          />
          <p className="text-[11px] text-muted-foreground">
            တင်ချိန် — {new Date(row.created_at).toLocaleString()}
          </p>
        </Card>
      ))}
    </div>
  );
}

export function SuggestionsPanel({ rows, refresh }: { rows: Suggestion[]; refresh: () => void }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <Card key={row.id}>
          <Input
            defaultValue={row.author ?? ""}
            onBlur={(e) => saveRow("suggestions", row.id, { author: e.target.value || null }, refresh)}
          />
          <Textarea
            rows={3}
            maxLength={300}
            defaultValue={row.message}
            onBlur={(e) =>
              saveRow("suggestions", row.id, { message: e.target.value.slice(0, 300) }, refresh)
            }
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {new Date(row.created_at).toLocaleString()}
            </span>
            <Button variant="destructive" size="icon" onClick={() => deleteRow("suggestions", row.id, refresh)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ audios */

export function AudiosPanel({ rows, refresh }: { rows: Audio[]; refresh: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (rows.length >= 5) return toast.error("အများဆုံး ၅ ခုသာ တင်နိုင်ပါသည်။");
    setBusy(true);
    try {
      const url = await uploadMedia(file, "audio");
      await insertRow(
        "audios",
        { title: title || file.name, url, sort_order: rows.length + 1 },
        refresh,
      );
      setTitle("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Card>
        <Label>MP3 အသစ် ({rows.length}/5)</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ခေါင်းစဉ်" />
        <Input
          type="file"
          accept="audio/*"
          disabled={busy || rows.length >= 5}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </Card>
      {rows.map((row) => (
        <Card key={row.id}>
          <div className="flex gap-2">
            <Input
              defaultValue={row.title ?? ""}
              onBlur={(e) => saveRow("audios", row.id, { title: e.target.value }, refresh)}
            />
            <Button variant="destructive" size="icon" onClick={() => deleteRow("audios", row.id, refresh)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
          <VisibilityToggle
            value={row.is_visible}
            onChange={(v) => saveRow("audios", row.id, { is_visible: v }, refresh)}
          />
          <audio controls preload="none" src={row.url} className="w-full">
            <track kind="captions" />
          </audio>
        </Card>
      ))}
    </div>
  );
}

/* --------------------------------------------------- marquees and splashes */

export function MarqueesPanel({ rows, refresh }: { rows: Marquee[]; refresh: () => void }) {
  const [draft, setDraft] = useState({ text: "", color: "#0ea5e9", position: "top" });
  return (
    <div className="space-y-2">
      <Card>
        <Label>စာတန်းပြေး အသစ်</Label>
        <Textarea
          rows={2}
          maxLength={1000}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder="စာသား (၁၀၀၀ လုံးအထိ)"
        />
        <div className="flex gap-2">
          <Input
            type="color"
            className="w-16"
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          />
          <select
            className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            value={draft.position}
            onChange={(e) => setDraft({ ...draft, position: e.target.value })}
          >
            <option value="top">အပေါ်</option>
            <option value="bottom">အောက်</option>
          </select>
          <Button
            onClick={() => {
              if (!draft.text.trim()) return;
              insertRow(
                "marquees",
                { ...draft, text: draft.text.slice(0, 1000), sort_order: rows.length + 1 },
                refresh,
              );
              setDraft({ text: "", color: "#0ea5e9", position: "top" });
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </Card>
      {rows.map((row) => (
        <Card key={row.id}>
          <Textarea
            rows={2}
            maxLength={1000}
            defaultValue={row.text}
            onBlur={(e) => saveRow("marquees", row.id, { text: e.target.value.slice(0, 1000) }, refresh)}
          />
          <div className="flex items-center gap-2">
            <Input
              type="color"
              className="w-16"
              defaultValue={row.color}
              onBlur={(e) => saveRow("marquees", row.id, { color: e.target.value }, refresh)}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              defaultValue={row.position}
              onChange={(e) => saveRow("marquees", row.id, { position: e.target.value }, refresh)}
            >
              <option value="top">အပေါ်</option>
              <option value="bottom">အောက်</option>
            </select>
            <VisibilityToggle
              value={row.is_visible}
              onChange={(v) => saveRow("marquees", row.id, { is_visible: v }, refresh)}
            />
            <Button
              variant="destructive"
              size="icon"
              className="ml-auto"
              onClick={() => deleteRow("marquees", row.id, refresh)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function SplashPanel({ rows, refresh }: { rows: SplashSlide[]; refresh: () => void }) {
  const [draft, setDraft] = useState({ text: "", subtext: "", image_url: "" });
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Card>
        <Label>ဖွင့်ချိန်ပြ စာသားအသစ် (၅ စက္ကန့်)</Label>
        <Input
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder="ခေါင်းစဉ်"
        />
        <Input
          value={draft.subtext}
          onChange={(e) => setDraft({ ...draft, subtext: e.target.value })}
          placeholder="အောက်စာသား"
        />
        <Input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              setDraft((d) => ({ ...d, image_url: "" }));
              const url = await uploadMedia(f, "splash");
              setDraft((d) => ({ ...d, image_url: url }));
              toast.success("ပုံတင်ပြီးပါပြီ။");
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button
          className="w-full"
          onClick={() => {
            if (!draft.text.trim()) return;
            insertRow(
              "splash_slides",
              {
                text: draft.text,
                subtext: draft.subtext || null,
                image_url: draft.image_url || null,
                sort_order: rows.length + 1,
              },
              refresh,
            );
            setDraft({ text: "", subtext: "", image_url: "" });
          }}
        >
          <Plus className="size-4" /> ထည့်မည်
        </Button>
      </Card>
      {rows.map((row) => (
        <Card key={row.id}>
          <Input
            defaultValue={row.text}
            onBlur={(e) => saveRow("splash_slides", row.id, { text: e.target.value }, refresh)}
          />
          <Input
            defaultValue={row.subtext ?? ""}
            onBlur={(e) =>
              saveRow("splash_slides", row.id, { subtext: e.target.value || null }, refresh)
            }
          />
          <div className="flex items-center gap-3">
            <VisibilityToggle
              value={row.is_visible}
              onChange={(v) => saveRow("splash_slides", row.id, { is_visible: v }, refresh)}
            />
            <Button
              variant="destructive"
              size="icon"
              className="ml-auto"
              onClick={() => deleteRow("splash_slides", row.id, refresh)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ viewer count */

export function ViewersPanel({ count, refresh }: { count: number; refresh: () => void }) {
  const [value, setValue] = useState(String(count));
  return (
    <Card>
      <Label>ကြည့်ရှုသူ အရေအတွက်</Label>
      <div className="flex gap-2">
        <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button
          onClick={async () => {
            const { error } = await supabase
              .from("viewer_counter")
              .update({ count: Number(value) })
              .eq("id", 1);
            if (error) return toast.error(error.message);
            toast.success("ပြင်ဆင်ပြီးပါပြီ။");
            refresh();
          }}
        >
          <Save className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------- live notice board */

const LIVE_STYLES = [
  { value: "plain", label: "ရိုးရိုးပြ" },
  { value: "marquee", label: "စာတန်းပြေး" },
  { value: "blink", label: "မိတ်တုတ်မိတ်တုတ်" },
];

function StyleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {LIVE_STYLES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export function LiveBoardPanel({
  rows,
  settings,
  refresh,
}: {
  rows: LiveNotice[];
  settings: LiveBoardSettings | null;
  refresh: () => void;
}) {
  const [draft, setDraft] = useState({
    message: "",
    style: "plain",
    color: "#0ea5e9",
    start_time: "",
    end_time: "",
  });
  const [busy, setBusy] = useState(false);

  async function saveSettings(patch: Record<string, unknown>) {
    const { error } = await supabase.from("live_board_settings").update(patch as never).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("သိမ်းဆည်းပြီးပါပြီ။");
    refresh();
  }

  async function uploadSound(file: File, apply: (url: string) => void) {
    setBusy(true);
    try {
      apply(await uploadMedia(file, "live-sound"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function move(row: LiveNotice, dir: -1 | 1) {
    const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((r) => r.id === row.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    await supabase.from("live_notices").update({ sort_order: sorted[j].sort_order }).eq("id", row.id);
    await supabase.from("live_notices").update({ sort_order: row.sort_order }).eq("id", sorted[j].id);
    refresh();
  }

  return (
    <div className="space-y-2">
      <Card>
        <Label>ရထားအချိန် အော်တိုအသိပေးချက်</Label>
        <VisibilityToggle
          value={settings?.auto_enabled ?? true}
          onChange={(v) => saveSettings({ auto_enabled: v })}
          label="အော်တိုပြမည်"
        />
        <div className="flex gap-2">
          <Input
            type="color"
            className="w-16"
            defaultValue={settings?.color ?? "#0284c7"}
            onBlur={(e) => saveSettings({ color: e.target.value })}
          />
          <StyleSelect
            value={settings?.style ?? "plain"}
            onChange={(v) => saveSettings({ style: v })}
          />
          <Input
            type="number"
            min={0}
            max={60}
            className="w-20"
            defaultValue={settings?.lead_minutes ?? 1}
            onBlur={(e) => saveSettings({ lead_minutes: Number(e.target.value) || 0 })}
          />
        </div>
        <Label className="text-xs">အသိပေးအသံ (mp3)</Label>
        <Input
          type="file"
          accept="audio/*"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadSound(f, (url) => saveSettings({ sound_url: url }));
          }}
        />
        {settings?.sound_url ? (
          <div className="flex items-center gap-2">
            <audio controls preload="none" src={settings.sound_url} className="w-full">
              <track kind="captions" />
            </audio>
            <Button size="icon" variant="outline" onClick={() => saveSettings({ sound_url: null })}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </Card>

      <Card>
        <Label>အသိပေးချက် အသစ်</Label>
        <Textarea
          rows={2}
          maxLength={1000}
          value={draft.message}
          onChange={(e) => setDraft({ ...draft, message: e.target.value })}
          placeholder="စာသား"
        />
        <div className="flex gap-2">
          <Input
            type="color"
            className="w-16"
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          />
          <StyleSelect value={draft.style} onChange={(v) => setDraft({ ...draft, style: v })} />
        </div>
        <Label className="text-xs">ပြမည့်အချိန် (မှ — ထိ) · ဗလာထားလျှင် အမြဲပြမည်</Label>
        <div className="flex gap-2">
          <Input
            type="time"
            value={draft.start_time}
            onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
          />
          <Input
            type="time"
            value={draft.end_time}
            onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
          />
          <Button
            onClick={() => {
              if (!draft.message.trim()) return;
              insertRow(
                "live_notices",
                {
                  message: draft.message.slice(0, 1000),
                  style: draft.style,
                  color: draft.color,
                  start_time: draft.start_time || null,
                  end_time: draft.end_time || null,
                  sort_order: rows.length + 1,
                },
                refresh,
              );
              setDraft({ message: "", style: "plain", color: "#0ea5e9", start_time: "", end_time: "" });
            }}
          >
            <Plus className="size-4" /> ထည့်မည်
          </Button>
        </div>
      </Card>

      {[...rows]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => (
          <Card key={row.id}>
            <Textarea
              rows={2}
              maxLength={1000}
              defaultValue={row.message}
              onBlur={(e) => {
                if (e.target.value !== row.message)
                  saveRow("live_notices", row.id, { message: e.target.value }, refresh);
              }}
            />
            <div className="flex gap-2">
              <Input
                type="color"
                className="w-16"
                defaultValue={row.color}
                onBlur={(e) => saveRow("live_notices", row.id, { color: e.target.value }, refresh)}
              />
              <StyleSelect
                value={row.style}
                onChange={(v) => saveRow("live_notices", row.id, { style: v }, refresh)}
              />
              <Button size="icon" variant="outline" onClick={() => move(row, -1)}>
                <ArrowUp className="size-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => move(row, 1)}>
                <ArrowDown className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={() => deleteRow("live_notices", row.id, refresh)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Label className="text-xs">ပြမည့်အချိန် (မှ — ထိ) · ဗလာ = အမြဲပြ</Label>
            <div className="flex gap-2">
              <Input
                type="time"
                defaultValue={(row.start_time ?? "").slice(0, 5)}
                onBlur={(e) =>
                  saveRow("live_notices", row.id, { start_time: e.target.value || null }, refresh)
                }
              />
              <Input
                type="time"
                defaultValue={(row.end_time ?? "").slice(0, 5)}
                onBlur={(e) =>
                  saveRow("live_notices", row.id, { end_time: e.target.value || null }, refresh)
                }
              />
            </div>
            <Label className="text-xs">အသံ (mp3)</Label>
            <Input
              type="file"
              accept="audio/*"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  uploadSound(f, (url) =>
                    saveRow("live_notices", row.id, { sound_url: url }, refresh),
                  );
              }}
            />
            {row.sound_url ? (
              <audio controls preload="none" src={row.sound_url} className="w-full">
                <track kind="captions" />
              </audio>
            ) : null}
            <VisibilityToggle
              value={row.is_visible}
              onChange={(v) => saveRow("live_notices", row.id, { is_visible: v }, refresh)}
            />
          </Card>
        ))}
    </div>
  );
}

const DEMU_CITIES = ["ရန်ကုန်", "မန္တလေး", "နေပြည်တော်", "မော်လမြိုင်", "ပြည်"];

const DEMU_ROUTES = [
  { city: "ရန်ကုန်", route: "ရန်ကုန် → နေပြည်တော် → မန္တလေး (အဆန်)" },
  { city: "မန္တလေး", route: "မန္တလေး → နေပြည်တော် → ရန်ကုန် (အစုန်)" },
  { city: "ရန်ကုန်", route: "ရန်ကုန် → မော်လမြိုင် (အဆန်)" },
  { city: "မော်လမြိုင်", route: "မော်လမြိုင် → ရန်ကုန် (အစုန်)" },
  { city: "ရန်ကုန်", route: "ရန်ကုန် → ပြည် (အဆန်)" },
  { city: "ပြည်", route: "ပြည် → ရန်ကုန် (အစုန်)" },
];

export function DemuPanel({ rows, refresh }: { rows: DemuSchedule[]; refresh: () => void }) {
  const [draft, setDraft] = useState({
    city: DEMU_CITIES[0],
    train_no: "",
    route: "",
    depart_time: "",
    arrive_time: "",
    fare_ordinary: "",
    fare_upper: "",
    note: "",
  });

  return (
    <div className="space-y-2">
      <Card>
        <Label>DEMU ခရီးစဉ် အသစ်</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={DEMU_ROUTES.some((r) => r.route === draft.route) ? draft.route : ""}
          onChange={(e) => {
            const p = DEMU_ROUTES.find((r) => r.route === e.target.value);
            if (p) setDraft({ ...draft, route: p.route, city: p.city });
          }}
        >
          <option value="">လမ်းကြောင်း ရွေးပါ (အဆန်/အစုန်)</option>
          {DEMU_ROUTES.map((r) => (
            <option key={r.route} value={r.route}>
              {r.route}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={draft.city}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
          >
            {DEMU_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Input
            placeholder="ရထားအမှတ်"
            value={draft.train_no}
            onChange={(e) => setDraft({ ...draft, train_no: e.target.value })}
          />
          <Input
            className="col-span-2"
            placeholder="လမ်းကြောင်း (ဥပမာ ရန်ကုန် → ပဲခူး)"
            value={draft.route}
            onChange={(e) => setDraft({ ...draft, route: e.target.value })}
          />
          <Input
            type="time"
            value={draft.depart_time}
            onChange={(e) => setDraft({ ...draft, depart_time: e.target.value })}
          />
          <Input
            type="time"
            value={draft.arrive_time}
            onChange={(e) => setDraft({ ...draft, arrive_time: e.target.value })}
          />
          <Input
            type="number"
            placeholder="ပထမတန်းခ"
            value={draft.fare_ordinary}
            onChange={(e) => setDraft({ ...draft, fare_ordinary: e.target.value })}
          />
          <Input
            type="number"
            placeholder="အထက်တန်းခ"
            value={draft.fare_upper}
            onChange={(e) => setDraft({ ...draft, fare_upper: e.target.value })}
          />
          <Input
            className="col-span-2"
            placeholder="မှတ်ချက်"
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
        </div>
        <Button
          onClick={() => {
            if (!draft.route.trim()) return;
            insertRow(
              "demu_schedules",
              {
                city: draft.city,
                train_no: draft.train_no,
                route: draft.route,
                depart_time: draft.depart_time || null,
                arrive_time: draft.arrive_time || null,
                fare_ordinary: draft.fare_ordinary === "" ? null : Number(draft.fare_ordinary),
                fare_upper: draft.fare_upper === "" ? null : Number(draft.fare_upper),
                note: draft.note || null,
                sort_order: rows.length + 1,
              },
              refresh,
            );
            setDraft({
              city: draft.city,
              train_no: "",
              route: "",
              depart_time: "",
              arrive_time: "",
              fare_ordinary: "",
              fare_upper: "",
              note: "",
            });
          }}
        >
          <Plus className="size-4" /> ထည့်မည်
        </Button>
      </Card>

      {rows.map((row) => (
        <Card key={row.id}>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              defaultValue={row.city}
              onChange={(e) => saveRow("demu_schedules", row.id, { city: e.target.value }, refresh)}
            >
              {[...new Set([...DEMU_CITIES, row.city])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Input
              defaultValue={row.train_no}
              placeholder="ရထားအမှတ်"
              onBlur={(e) => saveRow("demu_schedules", row.id, { train_no: e.target.value }, refresh)}
            />
            <Input
              className="col-span-2"
              defaultValue={row.route}
              placeholder="လမ်းကြောင်း"
              onBlur={(e) => saveRow("demu_schedules", row.id, { route: e.target.value }, refresh)}
            />
            <Input
              type="time"
              defaultValue={row.depart_time ?? ""}
              onBlur={(e) =>
                saveRow("demu_schedules", row.id, { depart_time: e.target.value || null }, refresh)
              }
            />
            <Input
              type="time"
              defaultValue={row.arrive_time ?? ""}
              onBlur={(e) =>
                saveRow("demu_schedules", row.id, { arrive_time: e.target.value || null }, refresh)
              }
            />
            <Input
              type="number"
              defaultValue={row.fare_ordinary ?? ""}
              placeholder="ပထမတန်းခ"
              onBlur={(e) =>
                saveRow(
                  "demu_schedules",
                  row.id,
                  { fare_ordinary: e.target.value === "" ? null : Number(e.target.value) },
                  refresh,
                )
              }
            />
            <Input
              type="number"
              defaultValue={row.fare_upper ?? ""}
              placeholder="အထက်တန်းခ"
              onBlur={(e) =>
                saveRow(
                  "demu_schedules",
                  row.id,
                  { fare_upper: e.target.value === "" ? null : Number(e.target.value) },
                  refresh,
                )
              }
            />
            <Input
              className="col-span-2"
              defaultValue={row.note ?? ""}
              placeholder="မှတ်ချက်"
              onBlur={(e) =>
                saveRow("demu_schedules", row.id, { note: e.target.value || null }, refresh)
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <VisibilityToggle
              value={row.is_visible}
              onChange={(v) => saveRow("demu_schedules", row.id, { is_visible: v }, refresh)}
            />
            <Button
              variant="destructive"
              size="icon"
              className="ml-auto"
              onClick={() => deleteRow("demu_schedules", row.id, refresh)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
