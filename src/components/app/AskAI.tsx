import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Check, CheckCheck, Clock, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Item = {
  id: string;
  question: string;
  answer: string | null;
  status: "pending" | "answered" | "error" | "needs_admin_review";
  created_at: string;
  read: boolean;
};

const PUBLISHED = "https://railway-buddy-pro.lovable.app";
const CACHE = "ai_qa_history_v1";
const DEVICE = "ai_device_id";
const db = supabase as any;

function endpoint() {
  const h = window.location.hostname;
  const local = h.endsWith("lovable.app") || window.location.port === "8080";
  return `${local ? "" : PUBLISHED}/api/public/ask`;
}

function deviceId() {
  let id = localStorage.getItem(DEVICE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE, id);
  }
  return id;
}

function loadCache(): Item[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE) ?? "[]");
  } catch {
    return [];
  }
}

const SUGGESTIONS = [
  "မိုးညှင်းကနေ မြစ်ကြီးနား ဘယ်ရထားတွေရှိလဲ?",
  "အထက်တန်း လက်မှတ်ခ ဘယ်လောက်လဲ?",
  "ဒီနေ့ မီးသတင်း ဘာရှိလဲ?",
];

export function AskAI() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const itemsRef = useRef<Item[]>([]);
  const asking = useRef(new Set<string>());
  openRef.current = open;

  const update = useCallback((fn: (prev: Item[]) => Item[]) => {
    setItems((prev) => {
      const next = fn(prev).sort((a, b) => a.created_at.localeCompare(b.created_at));
      itemsRef.current = next;
      localStorage.setItem(CACHE, JSON.stringify(next));
      return next;
    });
  }, []);

  const applyAnswer = useCallback(
    (id: string, answer: string, silent = false) => {
      let isNew = false;
      update((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          if (it.status !== "answered") isNew = true;
          return { ...it, answer, status: "answered", read: it.read || openRef.current };
        }),
      );
      if (isNew && !silent && !openRef.current) {
        toast("🔔 AI ဖြေချက်အသစ် ရပါပြီ", { description: answer.slice(0, 80) });
      }
    },
    [update],
  );

  // Ask AI for one question (streams into the item)
  const runAsk = useCallback(
    async (it: Item) => {
      if (asking.current.has(it.id) || !navigator.onLine) return;
      asking.current.add(it.id);
      try {
        // make sure question is in database (works for offline-queued items)
        await db.from("ai_questions").upsert(
          { id: it.id, device_id: deviceId(), question: it.question, status: "pending" },
          { onConflict: "id", ignoreDuplicates: true },
        );
        const history = itemsRef.current
          .filter((x) => x.answer && x.id !== it.id)
          .slice(-4)
          .flatMap((x) => [
            { role: "user" as const, content: x.question },
            { role: "assistant" as const, content: (x.answer ?? "").slice(0, 4000) },
          ]);
        update((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "pending" } : x)));
        const res = await fetch(endpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: it.question, questionId: it.id, userId: deviceId(), history }),
        });
        const j = await res.json().catch(() => ({}));
        if (j.status === "needs_admin_review") {
          update((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "needs_admin_review" } : x)));
          return;
        }
        if (!res.ok || !j.answer) {
          update((prev) =>
            prev.map((x) => (x.id === it.id ? { ...x, status: "error", answer: j.error ?? "အဖြေ မရနိုင်ပါ" } : x)),
          );
          toast.error(j.error ?? "အဖြေ မရနိုင်ပါ။ ခဏနေမှ ပြန်မေးပါ။");
          return;
        }
        applyAnswer(it.id, j.answer);
      } catch {
        /* stays pending; retried on reconnect */
      } finally {
        asking.current.delete(it.id);
      }
    },
    [update, applyAnswer],
  );

  // Sync with database: pull answers, re-ask pending
  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    const { data } = await db
      .from("ai_questions")
      .select("id,question,answer,status,created_at")
      .eq("device_id", deviceId())
      .order("created_at", { ascending: false })
      .limit(100);
    const remote = (data ?? []) as Omit<Item, "read">[];
    update((prev) => {
      const map = new Map(prev.map((x) => [x.id, x]));
      for (const r of remote) {
        const local = map.get(r.id);
        if (!local) map.set(r.id, { ...r, read: false });
        else if (r.status === "answered" && local.status !== "answered")
          map.set(r.id, { ...local, answer: r.answer, status: "answered" });
        else if (r.status === "needs_admin_review" && local.status === "pending")
          map.set(r.id, { ...local, status: "needs_admin_review" });
      }
      return [...map.values()];
    });
    for (const it of itemsRef.current) if (it.status === "pending") void runAsk(it);
  }, [update, runAsk]);

  useEffect(() => {
    const cached = loadCache();
    itemsRef.current = cached;
    setItems(cached);
    setOnline(navigator.onLine);
    void sync();
    const on = () => {
      setOnline(true);
      void sync();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const ch = db
      .channel(`ai_q_${deviceId()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ai_questions", filter: `device_id=eq.${deviceId()}` },
        (p: any) => {
          if (p.new?.status === "answered" && p.new.answer) applyAnswer(p.new.id, p.new.answer);
          else if (p.new?.status === "needs_admin_review")
            update((prev) => prev.map((x) => (x.id === p.new.id && x.status !== "answered" ? { ...x, status: "needs_admin_review" } : x)));
        },
      )
      .subscribe();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      db.removeChannel(ch);
    };
  }, [sync, applyAnswer, update]);

  // mark answered items read when panel open
  useEffect(() => {
    if (open && items.some((x) => x.status === "answered" && !x.read)) {
      update((prev) => prev.map((x) => (x.status === "answered" ? { ...x, read: true } : x)));
    }
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, items, update]);

  async function ask(q: string) {
    q = q.trim().slice(0, 500);
    if (!q || busy) return;
    const it: Item = {
      id: crypto.randomUUID(),
      question: q,
      answer: null,
      status: "pending",
      created_at: new Date().toISOString(),
      read: true,
    };
    update((prev) => [...prev, it]);
    setText("");
    if (!navigator.onLine) {
      toast("အင်တာနက်ပြန်ရလျှင် အလိုအလျောက် မေးပေးပါမည်");
      return;
    }
    setBusy(true);
    await runAsk(it);
    setBusy(false);
  }

  const unread = items.filter((x) => x.status === "answered" && !x.read).length;

  return (
    <>
      {!open ? (
        <button
          type="button"
          aria-label="AI ကို မေးရန်"
          onClick={() => setOpen(true)}
          className="fixed bottom-16 right-4 z-40 flex items-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-card"
        >
          <Bot className="size-5" /> AI မေးရန်
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
      ) : (
        <div className="fixed inset-x-2 bottom-2 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:inset-x-auto sm:right-4 sm:w-96">
          <div className="surface-header flex items-center gap-2 px-4 py-3">
            <Bot className="size-5 text-primary-foreground" />
            <span className="flex-1 text-sm font-bold text-primary-foreground">
              ရထား AI အကူအညီ
              <span className="ml-2 text-[10px] font-normal opacity-80">{online ? "● အွန်လိုင်း" : "○ အော့ဖ်လိုင်း"}</span>
            </span>
            <button type="button" aria-label="ပိတ်ရန်" onClick={() => setOpen(false)}>
              <X className="size-5 text-primary-foreground" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {items.length === 0 ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">ရထားအချိန်၊ လက်မှတ်ခ၊ မီး၊ ကားလမ်း၊ ဖုန်းအင်တာနက် သတင်းများ မေးနိုင်ပါသည်။</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="block w-full rounded-xl bg-sky-soft px-3 py-2 text-left text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              items.map((m) => (
                <div key={m.id} className="space-y-1">
                  <div className="ml-8 whitespace-pre-wrap rounded-xl bg-primary px-3 py-2 text-primary-foreground">
                    {m.question}
                  </div>
                  <div className="mr-8 whitespace-pre-wrap rounded-xl bg-leaf-soft px-3 py-2 text-foreground">
                    {m.status === "needs_admin_review"
                      ? "လက်ရှိတွင် စီမံခန့်ခွဲသူ (Admin) မှ တိုက်ရိုက်ပြန်လည်ဖြေကြားပေးပါမည်။ ခဏစောင့်ဆိုင်းပေးပါခင်ဗျာ။"
                      : m.answer || (online ? "ခဏစောင့်ဆိုင်းပေးပါ... AI အဖြေထုတ်ပေးနေပါသည်..." : "အင်တာနက်ပြန်ရလျှင် ဖြေပေးပါမည်")}
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      {m.status === "pending" || m.status === "needs_admin_review" ? (
                        <><Clock className="size-3" /> စောင့်ဆိုင်းဆဲ</>
                      ) : m.read ? (
                        <><CheckCheck className="size-3" /> ဖတ်ပြီး</>
                      ) : (
                        <><Check className="size-3" /> မဖတ်ရသေး</>
                      )}
                      <span className="ml-auto">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
          <form
            className="flex gap-2 border-t border-border p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(text);
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="မေးခွန်း ရိုက်ထည့်ပါ…"
              className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" size="icon" disabled={busy || !text.trim()} aria-label="ပို့ရန်">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
