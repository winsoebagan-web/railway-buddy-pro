import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildContext } from "@/lib/ai-context.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const Body = z.object({
  mode: z.enum(["manual", "sweep"]),
  ids: z.array(z.string().uuid()).max(20).optional(),
});

const NOTE = "\n\n(AI အလိုအလျောက် ဖြေကြားချက်)";
const NO = "NO_ANSWER";
const STALE_MS = 30 * 60 * 1000; // after 30 min unanswered, AI gives best-effort answer

async function gemini(apiKey: string, system: string, question: string): Promise<string | null> {
  const models = ["gemini-flash-latest", "gemini-3-flash-preview", "gemini-flash-lite-latest"];
  for (const model of models) {
    for (const wait of [0, 5000]) {
      if (wait) await new Promise((r) => setTimeout(r, wait));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(45000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: question }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
          }),
        },
      ).catch(() => null);
      if (!res) continue;
      if (res.status === 429) continue;
      if (res.status === 503 || res.status === 404) break;
      if (!res.ok) return null;
      const j: any = await res.json().catch(() => null);
      const text = (j?.candidates?.[0]?.content?.parts ?? [])
        .filter((p: any) => !p.thought)
        .map((p: any) => p.text ?? "")
        .join("")
        .trim();
      return text || null;
    }
  }
  return null;
}

export const Route = createFileRoute("/api/public/auto-answer")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        // Admin only: verify the caller's session and admin role
        const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return Response.json({ error: "unauthorized" }, { status: 401, headers: CORS });
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const userSb = createClient(url, key, {
          auth: { persistSession: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              h.set("apikey", key);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data: isAdmin } = await (userSb as any).rpc("is_admin");
        if (!isAdmin) return Response.json({ error: "forbidden" }, { status: 403, headers: CORS });

        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400, headers: CORS });
        const { mode, ids } = parsed.data;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return Response.json({ error: "Gemini key missing" }, { status: 500, headers: CORS });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        let q = db
          .from("ai_questions")
          .select("id,question,created_at")
          .in("status", ["pending", "needs_admin_review"])
          .order("created_at", { ascending: true })
          .limit(mode === "manual" ? 20 : 10);
        if (mode === "manual") q = q.in("id", ids ?? []);
        const { data: rows } = await q;

        const context = await buildContext().catch(() => "");
        const base = `သင်သည် မိုးညှင်း ရထားခရီးစဉ် App ၏ အကူအညီပေးသူ ဖြစ်သည်။ အောက်ပါ App မှတ်တမ်းကိုသာ အခြေခံ၍ မြန်မာဘာသာဖြင့် တိုတိုရှင်းရှင်း ဖြေပါ။ ဘူတာနှစ်ခုကြား လက်မှတ်ခ = ဆိုက်ရောက်ဘူတာ၏ လက်မှတ်ခ နုတ် ထွက်ခွာဘူတာ၏ လက်မှတ်ခ။ မှတ်တမ်းတွင် မပါသည်ကို မခန့်မှန်းပါနှင့်။`;
        const confident = `${base} မှတ်တမ်းထဲမှ သေချာစွာ ဖြေနိုင်မှသာ ဖြေပါ။ သေချာမဖြေနိုင်ပါက ${NO} ဟုသာ ပြန်ပါ။\n\n${context}`;
        const bestEffort = `${base} အကောင်းဆုံး ကြိုးစားဖြေပါ၊ မသိပါက Viber 09683665974 မိုးညှင်းခရိုင်လမ်းညွန် Facebook page ကို ညွှန်းပါ။\n\n${context}`;

        let answered = 0;
        for (const r of (rows ?? []) as any[]) {
          const stale = Date.now() - new Date(r.created_at).getTime() > STALE_MS;
          const useBest = mode === "manual" || stale;
          const text = await gemini(apiKey, useBest ? bestEffort : confident, r.question);
          if (!text || text.includes(NO)) continue;
          const { error } = await db
            .from("ai_questions")
            .update({ answer: text + NOTE, status: "answered", answered_at: new Date().toISOString() })
            .eq("id", r.id)
            .in("status", ["pending", "needs_admin_review"]);
          if (!error) answered++;
        }
        return Response.json({ answered, checked: rows?.length ?? 0 }, { headers: CORS });
      },
    },
  },
});
