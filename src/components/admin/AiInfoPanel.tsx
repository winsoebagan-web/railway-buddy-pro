import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Row = { id: string; category: string; title: string; content: string; is_visible: boolean; sort_order: number };

const DEFAULT_CATS = [
  { v: "electricity", l: "လျှပ်စီးသတင်း" },
  { v: "road", l: "ကားလမ်းသတင်း" },
  { v: "phone", l: "ဖုန်းအင်တာနက်သတင်း" },
];

const NEW_CAT = "__new__";

const db = supabase as any;

export function AiInfoPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [cat, setCat] = useState("electricity");
  const [newCat, setNewCat] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    const [{ data, error }, { data: catRow }] = await Promise.all([
      db.from("ai_info").select("*").order("sort_order"),
      db.from("app_settings").select("value").eq("key", "ai_categories").maybeSingle(),
    ]);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    const saved = (catRow?.value?.list as string[] | undefined) ?? [];
    setCustomCats(saved.filter((c) => typeof c === "string" && c.trim()));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  // All known categories: defaults + custom + any already used by existing rows
  const cats = useMemo(() => {
    const labels = new Map<string, string>(DEFAULT_CATS.map((c) => [c.v, c.l]));
    for (const c of customCats) if (!labels.has(c)) labels.set(c, c);
    for (const r of rows) if (!labels.has(r.category)) labels.set(r.category, r.category);
    return [...labels.entries()].map(([v, l]) => ({ v, l }));
  }, [customCats, rows]);

  async function run(p: PromiseLike<{ error: any }>, ok = "သိမ်းပြီး") {
    const { error } = await p;
    if (error) toast.error(error.message);
    else toast.success(ok);
    void load();
  }

  async function saveCustomCats(list: string[]) {
    await db
      .from("app_settings")
      .upsert({ key: "ai_categories", value: { list }, updated_at: new Date().toISOString() });
  }

  async function addItem() {
    const category = cat === NEW_CAT ? newCat.trim() : cat;
    if (!category) {
      toast.error("အမျိုးအစားအမည် ထည့်ပါ");
      return;
    }
    if (!text.trim()) return;
    if (cat === NEW_CAT && !customCats.includes(category)) {
      const next = [...customCats, category];
      setCustomCats(next);
      await saveCustomCats(next);
    }
    await run(
      db.from("ai_info").insert({ category, title: title.trim(), content: text.trim(), sort_order: rows.length + 1 }),
    );
    setCat(category);
    setNewCat("");
    setTitle("");
    setText("");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        ဤသတင်းများကို App တွင် မပြပါ။ "AI မေးရန်" မှ မေးသောအခါ AI က အဖြေအဖြစ်သာ အသုံးပြုပါမည်။
      </p>
      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <Label>သတင်းအသစ်</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          {cats.map((c) => (
            <option key={c.v} value={c.v}>{c.l}</option>
          ))}
          <option value={NEW_CAT}>+ အမျိုးအစားအသစ် ထည့်မည်</option>
        </select>
        {cat === NEW_CAT && (
          <input
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            maxLength={60}
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="အမျိုးအစည်အသစ် (ဥပမာ - ရထားသတင်း)"
          />
        )}
        <input
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="သတင်းအမည် (ခေါင်းစဉ်)"
        />
        <Textarea rows={4} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} placeholder="သတင်းအကြောင်းအရာ" />
        <Button onClick={() => void addItem()}>
          <Plus className="size-4" /> တင်မည်
        </Button>
      </div>
      {cats.map((c) => (
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
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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
