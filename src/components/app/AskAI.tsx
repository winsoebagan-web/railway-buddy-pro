import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

const PUBLISHED = "https://railway-buddy-pro.lovable.app";

function endpoint() {
  const h = window.location.hostname;
  const local = h.endsWith("lovable.app") || window.location.port === "8080";
  return `${local ? "" : PUBLISHED}/api/public/ask`;
}

const SUGGESTIONS = [
  "မိုးညှင်းကနေ မြစ်ကြီးနား ဘယ်ရထားတွေရှိလဲ?",
  "အထက်တန်း လက်မှတ်ခ ဘယ်လောက်လဲ?",
  "မနက်ပိုင်း ထွက်တဲ့ရထား ဘယ်နှစ်နာရီလဲ?",
];

export function AskAI() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function ask(q: string) {
    q = q.trim();
    if (!q || busy) return;
    if (!navigator.onLine) {
      setMsgs((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "အင်တာနက် ချိတ်ဆက်ပြီးမှ မေးပါ။" }]);
      return;
    }
    const history = msgs.slice(-8);
    setMsgs((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setText("");
    setBusy(true);
    const put = (s: string) =>
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: s };
        return c;
      });
    try {
      const res = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        put(j.error ?? "အဖြေ မရနိုင်ပါ။ ခဏနေမှ ပြန်မေးပါ။");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        put(acc);
      }
      if (!acc) put("အဖြေ မရနိုင်ပါ။");
    } catch {
      put("ချိတ်ဆက်မှု မအောင်မြင်ပါ။");
    } finally {
      setBusy(false);
    }
  }

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
        </button>
      ) : (
        <div className="fixed inset-x-2 bottom-2 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:inset-x-auto sm:right-4 sm:w-96">
          <div className="surface-header flex items-center gap-2 px-4 py-3">
            <Bot className="size-5 text-primary-foreground" />
            <span className="flex-1 text-sm font-bold text-primary-foreground">ရထား AI အကူအညီ</span>
            <button type="button" aria-label="ပိတ်ရန်" onClick={() => setOpen(false)}>
              <X className="size-5 text-primary-foreground" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {msgs.length === 0 ? (
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
              msgs.map((m, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap rounded-xl px-3 py-2 ${
                    m.role === "user" ? "ml-8 bg-primary text-primary-foreground" : "mr-8 bg-leaf-soft text-foreground"
                  }`}
                >
                  {m.content || "စဉ်းစားနေပါသည်…"}
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
