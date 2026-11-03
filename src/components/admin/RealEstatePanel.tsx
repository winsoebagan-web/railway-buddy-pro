import { useCallback, useEffect, useState } from "react";
import { Bot, Check, Home, Loader2, MessageSquare, RefreshCw, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AI_ANSWER_UPDATED, requestAutoAnswer } from "@/lib/admin-auto-answer";
import { estateSummary } from "@/lib/estate-rules";

type Listing = Database["public"]["Tables"]["estate_listings"]["Row"];
type Inquiry = Database["public"]["Tables"]["ai_questions"]["Row"];
type Comment = Database["public"]["Tables"]["estate_comments"]["Row"];
const statuses: Record<string, string> = { pending: "စစ်ဆေးဆဲ", approved: "အတည်ပြုပြီး", rejected: "ငြင်းပယ်ပြီး" };

export function RealEstatePanel() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [listingFilter, setListingFilter] = useState("pending");
  const [inquiryFilter, setInquiryFilter] = useState("pending");
  const load = useCallback(async () => {
    const [l, q, c] = await Promise.all([
      supabase.from("estate_listings").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_questions").select("*").not("estate_listing_id", "is", null).order("created_at", { ascending: false }),
      supabase.from("estate_comments").select("*").order("created_at", { ascending: false }),
    ]);
    const failure = l.error || q.error || c.error;
    setError(failure?.message ?? "");
    if (!failure) { setListings(l.data ?? []); setInquiries(q.data ?? []); setComments(c.data ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => void load();
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener(AI_ANSWER_UPDATED, refresh);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener(AI_ANSWER_UPDATED, refresh); window.removeEventListener("focus", refresh); };
  }, [load]);

  async function action(id: string, run: () => PromiseLike<{ error: { message: string } | null }>) {
    if (busy) return;
    setBusy(id);
    try { const result = await run(); if (result.error) throw new Error(result.error.message); await load(); toast.success("သိမ်းဆည်းပြီး"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "မအောင်မြင်ပါ"); }
    finally { setBusy(null); }
  }
  async function ai(id: string) {
    if (busy) return;
    setBusy(id);
    try { const result = await requestAutoAnswer("manual", id); toast(result.answered ? "AI ဖြေကြားပြီး" : result.queued ? "AI အားသည်နှင့် ဆက်ဖြေပေးပါမည်။ ထပ်နှိပ်ရန် မလိုပါ။" : "Admin မှ တိုက်ရိုက်ဖြေကြားပေးပါ။"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "AI မအောင်မြင်ပါ"); }
    finally { await load(); setBusy(null); }
  }
  const summary = estateSummary(listings, inquiries);
  const title = (id: string | null) => listings.find(l => l.id === id)?.title ?? "ကြော်ငြာ";
  const empty = <p className="py-10 text-center text-sm text-muted-foreground">မှတ်တမ်း မရှိသေးပါ။</p>;
  return <section className="space-y-4">
    <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold leading-relaxed">မိုးညှင်းအိမ်ခြံမြေ စီမံခန့်ခွဲမှု</h2><Button variant="outline" size="icon" aria-label="ပြန်လည်ရယူမည်" onClick={() => void load()}><RefreshCw className="size-4" /></Button></div>
    <div className="grid grid-cols-3 gap-2">{[{ label: "ကြော်ငြာစုစုပေါင်း", count: summary.total, Icon: Home }, { label: "စစ်ဆေးရန်ကျန်", count: summary.pending, Icon: Check }, { label: "ဖြေရန်ကျန်", count: summary.unanswered, Icon: MessageSquare }].map(({ label, count, Icon }) => <div key={label} className="min-w-0 rounded-lg border border-border bg-card p-3"><Icon className="mb-2 size-4 text-primary" /><p className="text-2xl font-bold">{count}</p><p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{label}</p></div>)}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {loading ? <p className="flex items-center gap-2 py-8 text-sm"><Loader2 className="size-4 animate-spin" />ရယူနေသည်…</p> : <Tabs defaultValue="listings">
      <TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="listings">ကြော်ငြာများ</TabsTrigger><TabsTrigger value="inquiries">မေးမြန်းမှုများ</TabsTrigger><TabsTrigger value="comments">မှတ်ချက်များ</TabsTrigger></TabsList>
      <TabsContent value="listings" className="space-y-3">
        <Tabs value={listingFilter} onValueChange={setListingFilter}><TabsList className="h-auto flex-wrap"><TabsTrigger value="pending">စစ်ဆေးဆဲ</TabsTrigger><TabsTrigger value="approved">အတည်ပြုပြီး</TabsTrigger><TabsTrigger value="rejected">ငြင်းပယ်ပြီး</TabsTrigger><TabsTrigger value="all">အားလုံး</TabsTrigger></TabsList></Tabs>
        {listings.filter(l => listingFilter === "all" || l.status === listingFilter).length === 0 && empty}
        {listings.filter(l => listingFilter === "all" || l.status === listingFilter).map(l => <article key={l.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words font-bold">{l.title}</h3><Badge variant={l.status === "rejected" ? "destructive" : "secondary"}>{statuses[l.status]}</Badge></div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{[["အမျိုးအစား", l.property_type], ["မြေအမျိုးအစား", l.land_type], ["ဈေးနှုန်း", `${Number(l.price).toLocaleString()} ကျပ်`], ["အကျယ်အဝန်း", l.area], ["အလျား", l.length], ["အနံ", l.width], ["ဖုန်း", l.phone], ["Viber", l.viber], ["တည်နေရာ", l.location], ["တင်သူ", l.user_id ? "User" : l.guest_name || "Guest"]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value || "—"}</dd></div>)}</dl>
          {l.description && <p className="whitespace-pre-wrap break-words text-sm">{l.description}</p>}
          <div className="flex flex-wrap gap-2"><Button size="sm" disabled={!!busy || l.status === "approved"} onClick={() => void action(l.id, () => supabase.from("estate_listings").update({ status: "approved" }).eq("id", l.id))}><Check className="size-4" />Approve</Button><Button variant="outline" size="sm" disabled={!!busy || l.status === "rejected"} onClick={() => void action(l.id, () => supabase.from("estate_listings").update({ status: "rejected" }).eq("id", l.id))}><X className="size-4" />Reject</Button><Button variant="ghost" size="icon" aria-label="ကြော်ငြာဖျက်မည်" disabled={!!busy} onClick={() => { if (confirm("ကြော်ငြာနှင့် သက်ဆိုင်ရာ မေးမြန်းမှု၊ မှတ်ချက်များကို ဖျက်မလား?")) void action(l.id, () => supabase.from("estate_listings").delete().eq("id", l.id)); }}><Trash2 className="size-4 text-destructive" /></Button></div>
        </article>)}
      </TabsContent>
      <TabsContent value="inquiries" className="space-y-3">
        <Tabs value={inquiryFilter} onValueChange={setInquiryFilter}><TabsList className="h-auto flex-wrap"><TabsTrigger value="pending">ဖြေရန်ကျန်သော မေးခွန်းများ</TabsTrigger><TabsTrigger value="answered">ဖြေပြီးသော မေးခွန်းများ</TabsTrigger></TabsList></Tabs>
        {inquiries.filter(q => (q.status === "answered") === (inquiryFilter === "answered")).length === 0 && empty}
        {inquiries.filter(q => (q.status === "answered") === (inquiryFilter === "answered")).map(q => <article key={q.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-xs font-semibold text-primary">{title(q.estate_listing_id)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{q.question}</p></div><Button size="icon" variant="ghost" aria-label="မေးခွန်းဖျက်မည်" disabled={!!busy} onClick={() => { if (confirm("မေးခွန်းကို ဖျက်မလား?")) void action(q.id, () => supabase.from("ai_questions").delete().eq("id", q.id)); }}><Trash2 className="size-4 text-destructive" /></Button></div>
          <p className="text-xs text-muted-foreground">{q.submitter_id ? "User" : q.guest_name || "Guest"} · {new Date(q.created_at).toLocaleString()}</p>
          {q.answer ? <p className="whitespace-pre-wrap break-words border-l-2 border-primary pl-3 text-sm">{q.answer}</p> : <><Textarea aria-label="Reply" placeholder="အဖြေ ရိုက်ထည့်ပါ…" value={drafts[q.id] ?? ""} onChange={e => setDrafts(d => ({ ...d, [q.id]: e.target.value }))} />{q.auto_requested_at && <p className="text-xs text-primary">AI ဖြေရန် စောင့်ဆိုင်းနေပါသည်။</p>}{q.auto_request_error && <p className="text-xs text-destructive">{q.auto_request_error}</p>}<div className="flex flex-wrap gap-2"><Button size="sm" disabled={!!busy || !(drafts[q.id] ?? "").trim()} onClick={() => void action(q.id, () => supabase.from("ai_questions").update({ answer: drafts[q.id].trim(), status: "answered", answered_at: new Date().toISOString(), auto_requested_at: null, auto_request_error: null }).eq("id", q.id).is("answer", null))}><Send className="size-4" />Reply</Button><Button size="sm" variant="outline" className="h-auto min-h-9 max-w-full whitespace-normal" disabled={!!busy || !!q.auto_requested_at} onClick={() => void ai(q.id)}>{busy === q.id || q.auto_requested_at ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <Bot className="size-4 shrink-0" />}{q.auto_requested_at ? "AI ဖြေရန် စောင့်ဆိုင်းဆဲ…" : "AI ဖြင့် အလိုအလျောက် ဖြေမည်"}</Button></div></>}
        </article>)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-3">{comments.length === 0 && empty}{comments.map(c => <article key={c.id} className="rounded-lg border border-border bg-card p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-xs font-semibold text-primary">{title(c.listing_id)}</p><p className="my-2 whitespace-pre-wrap break-words text-sm">{c.body}</p><p className="text-xs text-muted-foreground">{c.user_id ? "User" : c.guest_name || "Guest"} · {new Date(c.created_at).toLocaleString()}</p></div><Button variant="ghost" size="icon" aria-label="မှတ်ချက်ဖျက်မည်" disabled={!!busy} onClick={() => { if (confirm("မှတ်ချက်ကို ဖျက်မလား?")) void action(c.id, () => supabase.from("estate_comments").delete().eq("id", c.id)); }}><Trash2 className="size-4 text-destructive" /></Button></div></article>)}</TabsContent>
    </Tabs>}
  </section>;
}