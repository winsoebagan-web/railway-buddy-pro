import { useCallback, useEffect, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Q = { id: string; question: string; status: string; created_at: string };
const db = supabase as any;

export function AiQuestionsPanel() {
  const [enabled, setEnabled] = useState(true);
  const [rows, setRows] = useState<Q[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [s, q] = await Promise.all([
      db.from("app_settings").select("value").eq("key", "ai_mode").maybeSingle(),
      db
        .from("ai_questions")
        .select("id,question,status,created_at")
        .in("status", ["pending", "needs_admin_review"])
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setEnabled(s.data?.value?.enabled !== false);
    if (q.error) toast.error(q.error.message);
    setRows((q.data ?? []) as Q[]);
  }, []);

  useEffect(() => {
    void load();
    const ch = db
      .channel("admin_ai_q")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_questions" }, () => void load())
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
  }, [load]);

  async function toggle(v: boolean) {
    setEnabled(v);
    const { error } = await db
      .from("app_settings")
      .upsert({ key: "ai_mode", value: { enabled: v }, updated_at: new Date().toISOString() });
    if (error) {
      toast.error(error.message);
      setEnabled(!v);
    } else toast.success(v ? "AI ဖြေကြားခြင်း ဖွင့်ပြီး" : "AI ပိတ်ပြီး — Admin ဖြေပါမည်");
  }

  async function reply(id: string) {
    const answer = (drafts[id] ?? "").trim();
    if (!answer) return;
    const { error } = await db
      .from("ai_questions")
      .update({ answer, status: "answered", answered_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("ဖြေကြားပြီး");
    setRows((r) => r.filter((x) => x.id !== id));
  }

  async function remove(id: string) {
    if (!confirm("ဤမေးခွန်းကို ဖျက်မလား?")) return;
    const { error } = await db.from("ai_questions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4">
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">AI အလိုအလျောက်ဖြေကြားခြင်း (ဖွင့်/ပိတ်)</span>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </label>
      <h3 className="text-sm font-bold">ဖြေရန်ကျန်သော မေးခွန်းများ ({rows.length})</h3>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">မေးခွန်းအသစ် မရှိပါ</p>}
      {rows.map((q) => (
        <div key={q.id} className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex items-start gap-2">
            <p className="flex-1 whitespace-pre-wrap text-sm">{q.question}</p>
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(q.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {new Date(q.created_at).toLocaleString()} · {q.status === "pending" ? "စောင့်ဆိုင်းဆဲ" : "Admin ဖြေရန်"}
          </p>
          <Textarea
            value={drafts[q.id] ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
            placeholder="အဖြေ ရိုက်ထည့်ပါ…"
            rows={2}
          />
          <Button size="sm" onClick={() => reply(q.id)} disabled={!(drafts[q.id] ?? "").trim()}>
            <Send className="mr-1 size-4" /> Reply
          </Button>
        </div>
      ))}
    </div>
  );
}
