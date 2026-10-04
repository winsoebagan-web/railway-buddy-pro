import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Row = { id: string; category: string; title: string; content: string; is_visible: boolean; sort_order: number };

const CATS = [
  { v: "electricity", l: "လျှပ်စစ်မီးသတင်း" },
  { v: "road", l: "ကားလမ်းသတင်း" },
  { v: "phone", l: "ဖုန်းအင်တာနက်သတင်း" },
];

const db = supabase as any;

export function AiInfoPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [cat, setCat] = useState("electricity");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await db.from("ai_info").select("*").order("sort_order");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(p: PromiseLike<{ error: any }>, ok = "သိမ်းပြီး") {
    const { error } = await p;
    if (error) toast.error(error.message);
    else toast.success(ok);
    void load();
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
          {CATS.map((c) => (
            <option key={c.v} value={c.v}>{c.l}</option>
          ))}
        </select>
        <input
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="သတင်းအမည် (ခေါင်းစဉ်)"
        />
        <Textarea rows={4} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} placeholder="သတင်းအကြောင်းအရာ" />
        <Button
          onClick={() => {
            if (!text.trim()) return;
            void run(
              db.from("ai_info").insert({ category: cat, title: title.trim(), content: text.trim(), sort_order: rows.length + 1 }),
            );
            setTitle("");
            setText("");
          }}
        >
          <Plus className="size-4" /> တင်မည်
        </Button>
      </div>
      {CATS.map((c) => (
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
