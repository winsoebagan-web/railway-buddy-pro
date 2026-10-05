import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Row = { id: string; category: string; title: string; content: string; is_visible: boolean; sort_order: number };

const DEFAULT_CATS = [
  { v: "electricity", l: "လျှပ်စစ်မီးသတင်း" },
  { v: "road", l: "ကားလမ်းသတင်း" },
  { v: "phone", l: "ဖုန်းအင်တာနက်သတင်း" },
];

const NEW_CAT = "__new__";
const ALL = "__all__";
const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

const db = supabase as any;

export function AiInfoPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [cat, setCat] = useState("electricity");
  const [newCat, setNewCat] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [filter, setFilter] = useState(ALL);
  const [manage, setManage] = useState(false);

  const load = useCallback(async () => {
    const [{ data, error }, { data: catRow }] = await Promise.all([
      db.from("ai_info").select("*").order("sort_order"),
      db.from("app_settings").select("value").eq("key", "ai_categories").maybeSingle(),
    ]);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    const saved = (catRow?.value?.list as string[] | undefined) ?? [];
    setCustomCats(saved.filter((c) => typeof c === "string" && c.trim()));
    setHidden(((catRow?.value?.hidden as string[] | undefined) ?? []).filter((c) => typeof c === "string"));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const cats = useMemo(() => {
    const labels = new Map<string, string>();
    for (const c of DEFAULT_CATS) if (!hidden.includes(c.v)) labels.set(c.v, c.l);
    for (const c of customCats) if (!labels.has(c)) labels.set(c, c);
    for (const r of rows) if (!labels.has(r.category)) labels.set(r.category, r.category);
    return [...labels.entries()].map(([v, l]) => ({ v, l }));
  }, [customCats, hidden, rows]);

  const labelOf = (v: string) => cats.find((c) => c.v === v)?.l ?? v;

  async function run(p: PromiseLike<{ error: any }>, ok = "သိမ်းပြီး") {
    const { error } = await p;
    if (error) toast.error(error.message);
    else toast.success(ok);
    void load();
  }

  async function saveCats(list: string[], hid: string[]) {
    setCustomCats(list);
    setHidden(hid);
    const { error } = await db
      .from("app_settings")
      .upsert({ key: "ai_categories", value: { list, hidden: hid }, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message);
  }

  async function addItem() {
    const category = cat === NEW_CAT ? newCat.trim() : cat;
    if (!category) {
      toast.error("အမျိုးအစားအမည် ထည့်ပါ");
      return;
    }
    if (!text.trim()) return;
    if (cat === NEW_CAT && !customCats.includes(category)) {
      await saveCats([...customCats, category], hidden.filter((h) => h !== category));
    }
    await run(
      db.from("ai_info").insert({ category, title: title.trim(), content: text.trim(), sort_order: rows.length + 1 }),
    );
    setCat(category);
    setNewCat("");
    setTitle("");
    setText("");
  }

  async function renameCat(old: string) {
    const name = window.prompt("အမျိုးအစားအမည်သစ်", labelOf(old))?.trim();
    if (!name || name === labelOf(old)) return;
    if (cats.some((c) => c.v === name || c.l === name)) {
      toast.error("ဤအမည် ရှိပြီးသားပါ");
      return;
    }
    const { error } = await db.from("ai_info").update({ category: name }).eq("category", old);
    if (error) return toast.error(error.message);
    const isDefault = DEFAULT_CATS.some((d) => d.v === old);
    await saveCats(
      [...customCats.filter((c) => c !== old), name],
      isDefault ? [...new Set([...hidden, old])] : hidden,
    );
    if (filter === old) setFilter(name);
    if (cat === old) setCat(name);
    toast.success("အမည်ပြောင်းပြီး");
    void load();
  }

  async function deleteCat(old: string) {
    const count = rows.filter((r) => r.category === old).length;
    const others = cats.filter((c) => c.v !== old);
    let target: string | null = null;
    if (count > 0) {
      const opts = others.map((c, i) => `${i + 1}. ${c.l}`).join("\n");
      const ans = window.prompt(
        `"${labelOf(old)}" တွင် သတင်း ${count} ခုရှိသည်။\nရွှေ့မည့်အမျိုးအစား နံပါတ်ရိုက်ပါ (သတင်းများပါ ဖျက်လိုလျှင် 0)\n${opts}`,
      );
      if (ans === null) return;
      const n = Number(ans.trim());
      if (n === 0) {
        if (!window.confirm("သတင်းများအားလုံးပါ ဖျက်မှာ သေချာပါသလား?")) return;
      } else if (others[n - 1]) target = others[n - 1].v;
      else return toast.error("နံပါတ် မှားနေပါသည်");
      const { error } = target
        ? await db.from("ai_info").update({ category: target }).eq("category", old)
        : await db.from("ai_info").delete().eq("category", old);
      if (error) return toast.error(error.message);
    } else if (!window.confirm(`"${labelOf(old)}" ကို ဖျက်မလား?`)) return;
    const isDefault = DEFAULT_CATS.some((d) => d.v === old);
    await saveCats(customCats.filter((c) => c !== old), isDefault ? [...new Set([...hidden, old])] : hidden);
    if (filter === old) setFilter(ALL);
    if (cat === old) setCat(others[0]?.v ?? NEW_CAT);
    toast.success("ဖျက်ပြီး");
    void load();
  }

  const shown = filter === ALL ? cats : cats.filter((c) => c.v === filter);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        ဤသတင်းများကို App တွင် မပြပါ။ "AI မေးရန်" မှ မေးသောအခါ AI က အဖြေအဖြစ်သာ အသုံးပြုပါမည်။
      </p>
      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <Label>သတင်းအသစ်</Label>
        <select className={sel} value={cat} onChange={(e) => setCat(e.target.value)}>
          {cats.map((c) => (
            <option key={c.v} value={c.v}>{c.l}</option>
          ))}
          <option value={NEW_CAT}>+ အမျိုးအစားအသစ် ထည့်မည်</option>
        </select>
        {cat === NEW_CAT && (
          <input
            className={sel}
            maxLength={60}
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="အမျိုးအစားအသစ် (ဥပမာ - ရထားသတင်း)"
          />
        )}
        <input className={sel} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="သတင်းအမည် (ခေါင်းစဉ်)" />
        <Textarea rows={4} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} placeholder="သတင်းအကြောင်းအရာ" />
        <Button onClick={() => void addItem()}>
          <Plus className="size-4" /> တင်မည်
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <Label>အမျိုးအစား စီမံရန်</Label>
          <Button size="sm" variant="outline" onClick={() => setManage((m) => !m)}>
            {manage ? "ပိတ်မည်" : "ဖွင့်မည်"}
          </Button>
        </div>
        {manage &&
          cats.map((c) => (
            <div key={c.v} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">
                {c.l} <span className="text-xs text-muted-foreground">({rows.filter((r) => r.category === c.v).length})</span>
              </span>
              <Button size="icon" variant="outline" onClick={() => void renameCat(c.v)} aria-label="အမည်ပြောင်း">
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={() => void deleteCat(c.v)} aria-label="ဖျက်">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
      </div>

      <div className="space-y-1">
        <Label>အမျိုးအစားအလိုက် စစ်ထုတ်ရန်</Label>
        <select className={sel} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value={ALL}>အားလုံး ({rows.length})</option>
          {cats.map((c) => (
            <option key={c.v} value={c.v}>
              {c.l} ({rows.filter((r) => r.category === c.v).length})
            </option>
          ))}
        </select>
      </div>

      {shown.map((c) => (
        <div key={c.v} className="space-y-2">
          <h3 className="text-sm font-bold">{c.l}</h3>
          {rows.filter((r) => r.category === c.v).length === 0 && (
            <p className="text-xs text-muted-foreground">မရှိသေးပါ</p>
          )}
          {rows
            .filter((r) => r.category === c.v)
            .map((r) => (
              <div key={r.id} className="space-y-2 rounded-xl border border-border bg-card p-3">
                <input
                  className={sel}
                  maxLength={200}
                  defaultValue={r.title ?? ""}
                  onBlur={(e) =>
                    e.target.value !== (r.title ?? "") &&
                    run(db.from("ai_info").update({ title: e.target.value }).eq("id", r.id))
                  }
                  placeholder="သတင်းအမည် (ခေါင်းစဉ်)"
                />
                <Textarea
                  rows={3}
                  maxLength={3000}
                  defaultValue={r.content}
                  onBlur={(e) =>
                    e.target.value !== r.content && run(db.from("ai_info").update({ content: e.target.value }).eq("id", r.id))
                  }
                />
                <div className="flex items-center gap-2 text-xs">
                  <span>အမျိုးအစား</span>
                  <select
                    className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                    value={r.category}
                    onChange={(e) =>
                      run(db.from("ai_info").update({ category: e.target.value }).eq("id", r.id), "ရွှေ့ပြီး")
                    }
                  >
                    {cats.map((o) => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={r.is_visible}
                    onCheckedChange={(v) => run(db.from("ai_info").update({ is_visible: v }).eq("id", r.id))}
                  />
                  {r.is_visible ? "AI သုံးမည်" : "AI မသုံးပါ"}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="ml-auto"
                    onClick={() => run(db.from("ai_info").delete().eq("id", r.id), "ဖျက်ပြီး")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
