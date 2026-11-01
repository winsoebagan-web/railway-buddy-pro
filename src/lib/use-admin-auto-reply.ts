import { useEffect } from "react";
import { toast } from "sonner";
import { AI_KNOWLEDGE_CHANGED, requestAutoAnswer } from "./admin-auto-answer";

// The timer belongs to the authenticated dashboard, not an individual tab.
export function useAdminAutoReply(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let running = false;
    let stopped = false;
    let lastError = "";
    async function sweep() {
      if (stopped || running || !navigator.onLine) return;
      running = true;
      try {
        const result = await requestAutoAnswer("sweep");
        if (!stopped && result.answered) toast.success(`AI ဖြေကြားပြီး (${result.answered})`);
        lastError = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI ဖြေကြားမှု မအောင်မြင်ပါ။";
        if (!stopped && message !== lastError) toast.error(message);
        lastError = message;
      } finally { running = false; }
    }
    void sweep();
    const interval = window.setInterval(() => void sweep(), 60_000);
    const changed = () => void sweep();
    window.addEventListener(AI_KNOWLEDGE_CHANGED, changed);
    window.addEventListener("online", changed);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener(AI_KNOWLEDGE_CHANGED, changed);
      window.removeEventListener("online", changed);
    };
  }, [active]);
}