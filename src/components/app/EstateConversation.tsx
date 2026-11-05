import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LinkifiedText } from "@/lib/linkify";
import { sendEstateMessage, type EstateInquiry, type EstateMessage } from "@/lib/estate-mobile";

const labels = { owner: "ကြော်ငြာတင်သူ", inquirer: "မေးမြန်းသူ", admin: "Admin" };
export function EstateMessages({ messages }: { messages: EstateMessage[] }) {
  return <div className="space-y-3">{messages.map(m => <div key={m.id} className="border-l-2 border-primary pl-3"><p className="mb-1 text-xs font-semibold text-primary">{labels[m.sender]}</p><LinkifiedText text={m.body} className="whitespace-pre-wrap break-words text-sm" /><p className="mt-1 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("my-MM")}</p></div>)}</div>;
}
export function EstateConversation({ inquiry, online, onSent }: { inquiry: EstateInquiry; online: boolean; onSent: () => Promise<void> }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="space-y-3"><p className="text-xs font-semibold text-primary">{labels[inquiry.role ?? "inquirer"]}</p><EstateMessages messages={inquiry.messages ?? []} /><form className="space-y-2" onSubmit={async e => {
    e.preventDefault(); if (!body.trim() || busy || !online) return;
    setBusy(true); setError("");
    try { await sendEstateMessage(inquiry.id, body); setBody(""); await onSent(); }
    catch { setError("စာမပို့နိုင်ပါ။ အင်တာနက်စစ်ပြီး ပြန်ပို့ပါ။"); }
    finally { setBusy(false); }
  }}><Textarea aria-label="ပြန်စာ" maxLength={2000} value={body} onChange={e => setBody(e.target.value)} rows={2} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" size="sm" disabled={!online || busy || !body.trim()}><Send className="size-4" />{busy ? "ပို့နေသည်…" : "စာပို့မည်"}</Button></form></div>;
}