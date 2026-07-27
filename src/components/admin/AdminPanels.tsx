import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/admin-auth";
import type {
  Audio,
  Marquee,
  Post,
  Report,
  Section,
  SplashSlide,
  Station,
  Suggestion,
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
  | "sections";

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
        <Label>ပို့စ်အသစ်</Label>
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
        <Input
          placeholder="Facebook URL"
          value={draft.facebook_url}
          onChange={(e) => setDraft({ ...draft, facebook_url: e.target.value })}
        />
        <Input
          placeholder="TikTok URL"
          value={draft.tiktok_url}
          onChange={(e) => setDraft({ ...draft, tiktok_url: e.target.value })}
        />
        <Input
          placeholder="Website URL"
          value={draft.website_url}
          onChange={(e) => setDraft({ ...draft, website_url: e.target.value })}
        />
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
              is_pinned: false,
            });
          }}
        >
          <Plus className="size-4" /> တင်မည်
        </Button>
      </Card>

      {rows.map((row) => (
        <Card key={row.id}>
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
