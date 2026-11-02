import { supabase } from "@/integrations/supabase/client";

export const AI_KNOWLEDGE_CHANGED = "ai-knowledge-changed";
export const AI_ANSWER_UPDATED = "ai-answer-updated";

export async function requestAutoAnswer(mode: "manual" | "sweep", id?: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Admin ပြန်ဝင်ပေးပါ။");
  const local = window.location.hostname.endsWith("lovable.app") || window.location.port === "8080";
  const response = await fetch(`${local ? "" : "https://railway-buddy-pro.lovable.app"}/api/public/auto-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ mode, ...(id ? { ids: [id] } : {}) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "AI ဖြေကြားမှု မအောင်မြင်ပါ။");
  if (result.answered > 0) window.dispatchEvent(new Event(AI_ANSWER_UPDATED));
  return result as { answered: number; checked: number; busy?: boolean; disabled?: boolean; coolingDown?: boolean; queued?: boolean };
}