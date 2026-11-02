import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildContext } from "@/lib/ai-context.server";
import { AUTO_NOTE, bestEffort, usableAnswer, explicitQueueRuns, keepExplicitRequest } from "@/lib/auto-answer-rules";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const Body = z.object({ mode: z.enum(["manual", "sweep"]), ids: z.array(z.string().uuid()).max(1).optional() });

class AIError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function gemini(apiKey: string, system: string, question: string) {
  // Preserve the working provider/model. A denial or unavailable model is terminal.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < 2) {
        const retryAfter = Number(res.headers.get("Retry-After"));
        await new Promise(resolve => setTimeout(resolve, Math.max(retryAfter * 1000 || 0, attempt === 0 ? 5000 : 10000)));
        continue;
      }
      const message = res.status === 429 ? "AI မေးခွန်းများလွန်းနေပါသည်။ နောက်တစ်ကြိမ် စစ်ဆေးချိန်တွင် ဆက်လုပ်ပါမည်။"
        : res.status === 401 || res.status === 403 ? "AI အသုံးပြုခွင့်ကို စစ်ဆေးပြင်ဆင်ရန် လိုအပ်ပါသည်။ အလိုအလျောက်ဖြေခြင်း ရပ်ထားပါသည်။"
        : res.status === 404 ? "သတ်မှတ်ထားသော AI ကို လက်ရှိအသုံးမပြုနိုင်ပါ။"
        : "AI ဖြေကြားမှု မအောင်မြင်ပါ။";
      throw new AIError(message, res.status);
    }
    const candidate = data?.candidates?.[0];
    if (data?.promptFeedback?.blockReason || ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"].includes(candidate?.finishReason)) {
      throw new AIError("AI က ဤမေးခွန်းကို ဖြေကြားရန် ငြင်းဆိုပါသည်။ Admin မှ တိုက်ရိုက်ဖြေကြားပေးပါ။", 422);
    }
    const text = (candidate?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought)
      .map((p: { text?: string }) => p.text ?? "").join("").trim();
    if (!text) throw new AIError("AI ထံမှ အဖြေမရပါ။ Admin မှ တိုက်ရိုက်ဖြေကြားပေးပါ။", 422);
    return text;
  }
  throw new AIError("AI ဖြေကြားမှု မအောင်မြင်ပါ။", 502);
}

export const Route = createFileRoute("/api/public/auto-answer")({
  server: { handlers: {
    OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
    POST: async ({ request }) => {
      const json = (body: object, status = 200) => Response.json(body, { status, headers: CORS });
      const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) return json({ error: "Admin ဝင်ရောက်ရန် လိုအပ်ပါသည်။" }, 401);
      const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return json({ error: "ချိတ်ဆက်မှု မပြည့်စုံပါ။" }, 500);
      const userSb = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key); headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      } } });
      const { data: isAdmin, error: authError } = await userSb.rpc("is_admin");
      if (authError || !isAdmin) return json({ error: "Admin သာ အသုံးပြုနိုင်ပါသည်။" }, 403);
      const parsed = Body.safeParse(await request.json().catch(() => null));
      if (!parsed.success || (parsed.data.mode === "manual" && parsed.data.ids?.length !== 1)) return json({ error: "မေးခွန်းရွေးချယ်ပါ။" }, 400);
      const { mode, ids } = parsed.data;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return json({ error: "AI ချိတ်ဆက်မှု မရှိသေးပါ။" }, 503);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;
      // Persist before checking the shared lease: a busy response never loses the tap.
      if (mode === "manual") {
        const queued = await db.from("ai_questions").update({ auto_requested_at: new Date().toISOString(), auto_request_error: null })
          .in("id", ids).in("status", ["pending", "needs_admin_review"]).is("answer", null).is("auto_requested_at", null);
        if (queued.error) return json({ error: queued.error.message }, 500);
      }
      const { data: setting, error: settingsError } = await db.from("app_settings").select("value").eq("key", "ai_mode").maybeSingle();
      if (settingsError) return json({ error: settingsError.message }, 500);
      const explicit = await db.from("ai_questions").select("id,question,created_at,auto_attempts,auto_requested_at")
        .in("status", ["pending", "needs_admin_review"]).is("answer", null).not("auto_requested_at", "is", null)
        .order("auto_requested_at").limit(2);
      if (explicit.error) return json({ error: explicit.error.message }, 500);
      if (!explicitQueueRuns(setting?.value?.enabled !== false, explicit.data?.length ?? 0)) return json({ answered: 0, checked: 0, disabled: true });
      const lease = crypto.randomUUID();
      const { data: locks, error: lockError } = await db.rpc("acquire_ai_auto_reply", { p_token: lease });
      if (lockError) return json({ error: lockError.message }, 500);
      const state = locks?.[0];
      if (!state) return json({ answered: 0, checked: 0, busy: true, queued: true });
      try {
        if (state.paused_reason) return json({ error: state.paused_reason, paused: true }, 409);
        if (state.retry_after && Date.parse(state.retry_after) > Date.now()) return json({ answered: 0, checked: 0, coolingDown: true, queued: true });
        const result = mode === "manual"
          ? await db.from("ai_questions").select("id,question,created_at,auto_attempts,auto_requested_at").in("status", ["pending", "needs_admin_review"]).is("answer", null).in("id", ids)
          : explicit.data?.length ? explicit : await db.rpc("ai_auto_reply_candidates", { p_version: state.knowledge_version });
        if (result.error) throw new Error(result.error.message);
        const rows = result.data ?? [];
        if (!rows.length) return json({ answered: 0, checked: 0 });
        // Fail closed if knowledge could not be read; never invent a context.
        const context = await buildContext();
        const base = `သင်သည် မိုးညှင်း ရထားခရီးစဉ် App ၏ အကူအညီပေးသူ ဖြစ်သည်။ အောက်ပါ App မှတ်တမ်းကိုသာ အခြေခံ၍ မြန်မာဘာသာဖြင့် တိုတိုရှင်းရှင်း ဖြေပါ။ ဘူတာနှစ်ခုကြား လက်မှတ်ခ = ဆိုက်ရောက်ဘူတာ၏ လက်မှတ်ခ နုတ် ထွက်ခွာဘူတာ၏ လက်မှတ်ခ။ မှတ်တမ်းတွင် မပါသည်ကို မခန့်မှန်းပါနှင့်။ Hotline 1188 နှင့် ORTP website ကို လုံးဝမညွှန်းပါနှင့်။`;
        let answered = 0;
        for (const row of rows) {
          const { error: progressError, data: claimed } = await db.from("ai_questions").update({ auto_attempts: row.auto_attempts + 1, auto_attempted_at: new Date().toISOString(), auto_knowledge_version: state.knowledge_version }).eq("id", row.id).in("status", ["pending", "needs_admin_review"]).is("answer", null).select("id");
          if (progressError) throw new Error(progressError.message);
          if (!claimed?.length) continue;
          const instruction = bestEffort(row.auto_requested_at ? "manual" : mode, row.created_at)
            ? "အကောင်းဆုံး ကြိုးစားဖြေပါ၊ မသိပါက Viber 09683665974 မိုးညှင်းခရိုင်လမ်းညွန် Facebook pageသို့ ဆက်သွယ်နိုင်ပါသည်။ ဟု ညွှန်းပါ။"
            : "မှတ်တမ်းထဲမှ သေချာစွာ ဖြေနိုင်မှသာ ဖြေပါ။ သေချာမဖြေနိုင်ပါက NO_ANSWER ဟုသာ ပြန်ပါ။";
          let text: string;
          try { text = await gemini(apiKey, `${base} ${instruction}\n\n${context}`, row.question); }
          catch (error) {
            if (error instanceof AIError) {
              if ([401, 402, 403, 404].includes(error.status)) {
                await db.from("ai_auto_reply_state").update({ paused_reason: error.message }).eq("id", true).eq("lease_token", lease);
              } else if (error.status === 429 || error.status >= 500) {
                await db.from("ai_auto_reply_state").update({ retry_after: new Date(Date.now() + 5 * 60_000).toISOString() }).eq("id", true).eq("lease_token", lease);
              } else if (error.status === 422) {
                await db.from("ai_questions").update({ auto_attempts: 3 }).eq("id", row.id);
              }
              if (row.auto_requested_at && keepExplicitRequest(error.status)) {
                return json({ answered, checked: 1, queued: true, coolingDown: true });
              }
              await db.from("ai_questions").update({ auto_requested_at: null, auto_request_error: error.message })
                .eq("id", row.id).is("answer", null);
              return json({ error: error.message, answered }, error.status);
            }
            throw error;
          }
          if (!usableAnswer(text)) {
            if (row.auto_requested_at) await db.from("ai_questions").update({ auto_requested_at: null, auto_request_error: "အဖြေ မရရှိပါ။ Admin မှ တိုက်ရိုက်ဖြေကြားပေးပါ။" }).eq("id", row.id).is("answer", null);
            continue;
          }
          // An Admin reply or deletion made while AI is working always wins.
          const saved = await db.from("ai_questions").update({ answer: text + AUTO_NOTE, status: "answered", answered_at: new Date().toISOString(), auto_requested_at: null, auto_request_error: null }).eq("id", row.id).in("status", ["pending", "needs_admin_review"]).is("answer", null).select("id");
          if (saved.error) throw new Error(saved.error.message);
          answered += saved.data?.length ?? 0;
        }
        return json({ answered, checked: rows.length });
      } catch (error) {
        console.error("Auto answer failed", error instanceof Error ? error.message : "unknown");
        await db.from("ai_auto_reply_state").update({ retry_after: new Date(Date.now() + 5 * 60_000).toISOString() }).eq("id", true).eq("lease_token", lease);
        return json({ error: "အလိုအလျောက်ဖြေကြားမှု မအောင်မြင်ပါ။ Admin မှ တိုက်ရိုက်ဖြေကြားနိုင်ပါသည်။" }, 500);
      } finally {
        await db.from("ai_auto_reply_state").update({ lease_token: null, lease_until: null }).eq("id", true).eq("lease_token", lease);
      }
    },
  } },
});
