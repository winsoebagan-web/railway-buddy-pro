import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const Body = z.object({
  question: z.string().trim().min(1).max(500),
  question_id: z.string().uuid().optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(10)
    .optional(),
});

async function buildContext() {
  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const [trains, stops, demu, info] = await Promise.all([
    sb.from("trains").select("*").eq("is_visible", true).order("sort_order"),
    sb.from("train_stops").select("*").order("stop_order"),
    sb.from("demu_schedules").select("*").order("sort_order"),
    (sb as any).from("ai_info").select("category,content,updated_at").eq("is_visible", true).order("sort_order"),
  ]);
  const lines: string[] = [];
  for (const t of (trains.data ?? []) as any[]) {
    lines.push(
      `## ရထားအမှတ် ${t.number} ${t.name} (${t.origin} → ${t.destination}, ထွက် ${t.depart_time ?? "-"}${t.has_upper_class ? ", အထက်တန်းရှိ" : ""})`,
    );
    for (const s of ((stops.data ?? []) as any[]).filter((x) => x.train_id === t.id)) {
      if (!s.stops) {
        lines.push(`- ${s.station_name}: မရပ်`);
        continue;
      }
      lines.push(
        `- ${s.station_name}: ဆိုက် ${s.arrive_time ?? "-"} ထွက် ${s.depart_time ?? "-"} ရိုးရိုး ${s.fare_ordinary ?? "-"}${t.has_upper_class ? ` အထက် ${s.fare_upper ?? "-"}` : ""}${s.note ? ` (${s.note})` : ""}`,
      );
    }
  }
  const d = (demu.data ?? []) as any[];
  if (d.length) {
    lines.push("## DEMU ရထားများ");
    for (const r of d) {
      const { id, created_at, updated_at, sort_order, ...rest } = r;
      lines.push(`- ${JSON.stringify(rest)}`);
    }
  }
  const names: Record<string, string> = {
    electricity: "လျှပ်စစ်မီးသတင်း",
    road: "ကားလမ်းသတင်း",
    phone: "ဖုန်းအင်တာနက်သတင်း",
  };
  for (const [k, label] of Object.entries(names)) {
    const items = ((info.data ?? []) as any[]).filter((x) => x.category === k);
    if (!items.length) continue;
    lines.push(`## ${label}`);
    for (const x of items) lines.push(`- (${String(x.updated_at ?? "").slice(0, 10)}) ${x.content}`);
  }
  return lines.join("\n");
}

export const Route = createFileRoute("/api/public/ask")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "မေးခွန်း မမှန်ကန်ပါ" }, { status: 400, headers: CORS });
        }
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return Response.json({ error: "AI မချိတ်ဆက်ရသေးပါ" }, { status: 500, headers: CORS });

        const context = await buildContext();
        const system = `သင်သည် မိုးညှင်း ရထားခရီးစဉ် App ၏ အကူအညီပေးသူ ဖြစ်သည်။ အောက်ပါ App မှတ်တမ်း (အချိန်ဇယား၊ ဘူတာ၊ လက်မှတ်ခ ကျပ်ဖြင့်) ကိုသာ အခြေခံ၍ မြန်မာဘာသာဖြင့် တိုတိုရှင်းရှင်း ဖြေပါ။ ဘူတာနှစ်ခုကြား လက်မှတ်ခ = ဆိုက်ရောက်ဘူတာ၏ လက်မှတ်ခ နုတ် ထွက်ခွာဘူတာ၏ လက်မှတ်ခ။ မှတ်တမ်းတွင် မပါသည်ကို မခန့်မှန်းပါနှင့်၊ မသိပါက မသိကြောင်းပြော၍ Hotline 1188 သို့မဟုတ် https://ortp.railways.gov.mm/ ကို ညွှန်းပါ။\n\n${context}`;

        const input = [
          { role: "system", content: system },
          ...(parsed.data.history ?? []),
          { role: "user", content: parsed.data.question },
        ];

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
            method: "POST",
            signal: request.signal,
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey,
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({
              model: "openai/gpt-6-astra",
              input,
              stream: true,
              store: false,
              reasoning: { effort: "low", summary: "auto" },
              include: ["reasoning.encrypted_content"],
            }),
          });
        } catch {
          return new Response(null, { status: 499, headers: CORS });
        }

        if (!upstream.ok || !upstream.body) {
          const msg =
            upstream.status === 429
              ? "မေးခွန်းများလွန်းနေပါသည်။ ခဏနေမှ ပြန်မေးပါ။"
              : upstream.status === 402
                ? "AI အသုံးပြုခွင့် ကုန်သွားပါပြီ။"
                : "AI ဖြေကြားမှု မအောင်မြင်ပါ။";
          return Response.json({ error: msg }, { status: upstream.status, headers: CORS });
        }

        // Convert SSE to plain text stream of answer deltas
        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        const enc = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            let buf = "";
            let full = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                let i;
                while ((i = buf.indexOf("\n")) >= 0) {
                  const line = buf.slice(0, i).trim();
                  buf = buf.slice(i + 1);
                  if (!line.startsWith("data:")) continue;
                  const data = line.slice(5).trim();
                  if (!data || data === "[DONE]") continue;
                  try {
                    const ev = JSON.parse(data);
                    if (ev.type === "response.output_text.delta" && ev.delta) {
                      full += ev.delta;
                      controller.enqueue(enc.encode(ev.delta));
                    }
                  } catch {
                    /* ignore */
                  }
                }
              }
            } finally {
              const qid = parsed.data.question_id;
              if (qid && full) {
                try {
                  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
                  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                  const sb = createClient(url, key, { auth: { persistSession: false } });
                  await (sb as any)
                    .from("ai_questions")
                    .update({ answer: full, status: "answered", answered_at: new Date().toISOString() })
                    .eq("id", qid);
                } catch {
                  /* ignore */
                }
              }
              controller.close();
            }
          },
        });
        return new Response(stream, {
          headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
