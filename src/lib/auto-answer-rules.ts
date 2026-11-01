export const AUTO_NOTE = "\n\n(AI အလိုအလျောက် ဖြေကြားချက်)";
export const STALE_MS = 30 * 60 * 1000;
export const BATCH_SIZE = 2;
export const MAX_ATTEMPTS = 3;

export function bestEffort(mode: "manual" | "sweep", createdAt: string, now = Date.now()) {
  return mode === "manual" || now - new Date(createdAt).getTime() >= STALE_MS;
}

export function usableAnswer(text: string) {
  return Boolean(text.trim()) && !text.includes("NO_ANSWER");
}