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
  questionId: z.string().uuid().optional(),
  userId: z.string().min(8).max(64).optional(),
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
    (sb as any).from("ai_info").select("category,title,content,updated_at").eq("is_visible", true).order("sort_order"),
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
    for (const x of items)
      lines.push(`- ${x.title ? `[${x.title}] ` : ""}(${String(x.updated_at ?? "").slice(0, 10)}) ${x.content}`);
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
        const { question } = parsed.data;
        const questionId = parsed.data.questionId ?? parsed.data.question_id;
        const userId = parsed.data.userId;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        // Ensure the pending record exists and belongs to this device
        if (questionId) {
          const { data: row } = await db
            .from("ai_questions")
            .select("id,device_id,status,answer")
            .eq("id", questionId)
            .maybeSingle();
          if (!row) {
            if (!userId) return Response.json({ error: "မေးခွန်း မမှန်ကန်ပါ" }, { status: 400, headers: CORS });
            await db.from("ai_questions").insert({ id: questionId, device_id: userId, question, status: "pending" });
          } else if (userId && row.device_id !== userId) {
            return Response.json({ error: "ခွင့်မပြုပါ" }, { status: 403, headers: CORS });
          } else if (row.status === "answered" && row.answer) {
            return Response.json({ answer: row.answer, status: "answered" }, { headers: CORS });
          } else if (row.status === "error") {
            await db.from("ai_questions").update({ status: "pending" }).eq("id", questionId);
          }
        }

        const ADMIN_MSG =
          "လက်ရှိတွင် စီမံခန့်ခွဲသူ (Admin) မှ တိုက်ရိုက်ပြန်လည်ဖြေကြားပေးပါမည်။ ခဏစောင့်ဆိုင်းပေးပါခင်ဗျာ။";
        const toAdmin = async () => {
          if (questionId) await db.from("ai_questions").update({ status: "needs_admin_review" }).eq("id", questionId);
          return Response.json({ status: "needs_admin_review", message: ADMIN_MSG }, { headers: CORS });
        };
        // AI failures go to the Admin inbox instead of a dead end
        const fail = async (msg: string, _status: number) => {
          console.error("AI fail:", msg);
          return toAdmin();
        };

        const { data: mode } = await db.from("app_settings").select("value").eq("key", "ai_mode").maybeSingle();
        if (mode?.value?.enabled === false) return toAdmin();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return fail("AI မချိတ်ဆက်ရသေးပါ (Gemini Key မရှိ)", 500);

        const context = await buildContext().catch(() => "");
        const system = `သင်သည် မိုးညှင်း ရထားခရီးစဉ် App ၏ အကူအညီပေးသူ ဖြစ်သည်။ အောက်ပါ App မှတ်တမ်း (အချိန်ဇယား၊ ဘူတာ၊ လက်မှတ်ခ ကျပ်ဖြင့်၊ မီး/ကားလမ်း/ဖုန်းသတင်း) ကိုသာ အခြေခံ၍ မြန်မာဘာသာဖြင့် တိုတိုရှင်းရှင်း ဖြေပါ။ ဘူတာနှစ်ခုကြား လက်မှတ်ခ = ဆိုက်ရောက်ဘူတာ၏ လက်မှတ်ခ နုတ် ထွက်ခွာဘူတာ၏ လက်မှတ်ခ။ မှတ်တမ်းတွင် မပါသည်ကို မခန့်မှန်းပါနှင့်၊ မသိပါက မသိကြောင်းပြော၍ Hotline 1188 သို့မဟုတ် https://ortp.railways.gov.mm/ ကို ညွှန်းပါ။\n\n${context}`;

        const contents = [
          ...(parsed.data.history ?? []).map((h) => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
          })),
          { role: "user", parts: [{ text: question }] },
        ];

        // Primary model, with fallbacks when Google reports overload (503) or model retired (404)
        const models = ["gemini-1.5-flash", "gemini-flash-latest", "gemini-3-flash-preview", "gemini-flash-lite-latest"];
        let res!: Response;
        try {
          const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
          outer: for (const model of models) {
           for (const wait of [0, 5000, 10000]) {
            if (wait) await sleep(wait);
            res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: AbortSignal.timeout(45000),
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: system }] },
                  contents,
                  generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
                }),
              },
            );
            if (res.status === 429) { console.error("Gemini 429, retry", model); continue; }
            if (res.status !== 503 && res.status !== 404) break outer;
            console.error("Gemini fallback", model, res.status);
            continue outer;
           }
          }
        } catch (e) {
          const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
          return fail(timeout ? "AI ဖြေကြားချိန် ကြာလွန်းပါသည်။ ပြန်မေးပါ။" : "AI ဆာဗာနှင့် ချိတ်ဆက်၍ မရပါ။", 504);
        }

        if (!res.ok) {
          console.error("Gemini error", res.status, (await res.text().catch(() => "")).slice(0, 500));
          if (res.status === 429) return fail("မေးခွန်းများလွန်းနေပါသည်။ ခဏနေမှ ပြန်မေးပါ။", 429);
          if (res.status === 401 || res.status === 403) return fail("Gemini Key မမှန်ကန်ပါ။", 502);
          if (res.status === 400) return fail("AI တောင်းဆိုမှု မမှန်ကန်ပါ။", 502);
          return fail("AI ဖြေကြားမှု မအောင်မြင်ပါ။", 502);
        }

        const data: any = await res.json().catch(() => null);
        const answer = ((data?.candidates?.[0]?.content?.parts ?? []) as { text?: string }[])
          .filter((p: any) => !p.thought).map((p) => p.text ?? "")
          .join("")
          .trim();
        if (!answer) return fail("AI ထံမှ အဖြေ မရပါ။ ပြန်မေးပါ။", 502);

        if (questionId) {
          await db
            .from("ai_questions")
            .update({ answer, status: "answered", answered_at: new Date().toISOString() })
            .eq("id", questionId);
        }
        return Response.json({ answer, status: "answered" }, { headers: CORS });
      },
    },
  },
});
