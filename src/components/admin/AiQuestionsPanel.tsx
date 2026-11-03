import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AI_ANSWER_UPDATED, requestAutoAnswer } from "@/lib/admin-auto-answer";

type Q = { id: string; question: string; status: string; created_at: string; auto_requested_at: string | null; auto_request_error: string | null };
const db = supabase as any;

export function AiQuestionsPanel() {
  const [enabled, setEnabled] = useState(true);
  const [rows, setRows] = useState<Q[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, q] = await Promise.all([
      db.from("app_settings").select("value").eq("key", "ai_mode").maybeSingle(),
      db
        .from("ai_questions")
        .select("id,question,status,created_at,auto_requested_at,auto_request_error")
        .in("status", ["pending", "needs_admin_review"])
        .is("estate_listing_id", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setEnabled(s.data?.value?.enabled !== false);
    if (q.error) toast.error(q.error.message);
    setRows((q.data ?? []) as Q[]);
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener(AI_ANSWER_UPDATED, refresh);
    const polling = window.setInterval(refresh, 15_000);
    const ch = db
      .channel("admin_ai_q")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_questions" }, () => void load())
      .subscribe();
    return () => {
      window.removeEventListener(AI_ANSWER_UPDATED, refresh);
      window.clearInterval(polling);
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
      .update({ answer, status: "answered", answered_at: new Date().toISOString(), auto_requested_at: null, auto_request_error: null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("ဖြေကြားပြီး");
    setRows((r) => r.filter((x) => x.id !== id));
  }

  async function autoAnswer(id: string) {
    if (answering) return;
    setAnswering(id);
    try {
      const result = await requestAutoAnswer("manual", id);
      if (result.answered) toast.success("AI ဖြေကြားပြီး");
      else if (result.queued) toast("AI အားသည်နှင့် အလိုအလျောက် ဆက်ဖြေပေးပါမည်။ ထပ်နှိပ်ရန် မလိုပါ။");
      else toast("အဖြေ မတင်နိုင်သေးပါ။ Admin မှ တိုက်ရိုက်ဖြေကြားနိုင်ပါသည်။");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI ဖြေကြားမှု မအောင်မြင်ပါ။");
    } finally { setAnswering(null); }
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
          {q.auto_requested_at && <p className="text-xs text-primary">AI ဖြေရန် စောင့်ဆိုင်းနေပါသည်။ အားသည်နှင့် အလိုအလျောက် ဆက်ဖြေပေးပါမည်။</p>}
          {q.auto_request_error && <p className="text-xs text-destructive">{q.auto_request_error}</p>}
          <Textarea
            value={drafts[q.id] ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
            placeholder="အဖြေ ရိုက်ထည့်ပါ…"
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => reply(q.id)} disabled={answering === q.id || !(drafts[q.id] ?? "").trim()}>
            <Send className="mr-1 size-4" /> Reply
          </Button>
          <Button size="sm" variant="outline" className="h-auto min-h-9 max-w-full whitespace-normal text-left" onClick={() => void autoAnswer(q.id)} disabled={answering !== null || Boolean(q.auto_requested_at)}>
            {answering === q.id || q.auto_requested_at ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <Bot className="size-4 shrink-0" />}
            {answering === q.id ? "AI ဖြေကြားနေပါသည်…" : q.auto_requested_at ? "AI ဖြေရန် စောင့်ဆိုင်းဆဲ…" : "AI ဖြင့် အလိုအလျောက် ဖြေမည်"}
          </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
