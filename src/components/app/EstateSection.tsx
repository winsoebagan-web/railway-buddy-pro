import { useCallback, useEffect, useState } from "react";
import { CheckCheck, Clock, Home, MapPin, MessageCircle, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchEstateHistory, fetchEstateListings, submitEstateInquiry, submitEstateListing, type EstateDraft, type EstateListing } from "@/lib/estate-mobile";
import { ESTATE_DESCRIPTION_LIMIT, ESTATE_PROPERTY_TYPES, validateEstateInquiry, validateEstateSubmission } from "@/lib/estate-mobile-rules";
import { readCache, useCached, useOnline, writeCache } from "@/lib/offline";
import { LinkifiedText } from "@/lib/linkify";
import { EstateConversation } from "@/components/app/EstateConversation";

const EMPTY_DRAFT: EstateDraft = { property_type: "အိမ်", phone: "", viber: "", location: "", description: "", guest_name: "" };
const statusLabels: Record<string, string> = { pending: "စစ်ဆေးဆဲ", approved: "အတည်ပြုပြီး", rejected: "ငြင်းပယ်ပြီး" };
const time = (value: string) => new Date(value).toLocaleString("my-MM");

export function EstateSection() {
  const online = useOnline();
  const listings = useCached("estate-approved", fetchEstateListings);
  const history = useCached("estate-history", fetchEstateHistory);
  const [tab, setTab] = useState("listings");
  const [type, setType] = useState("all");
  const [draft, setDraft] = useState<EstateDraft>(EMPTY_DRAFT);
  const [posting, setPosting] = useState(false);
  const [selected, setSelected] = useState<EstateListing | null>(null);
  const [question, setQuestion] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [read, setRead] = useState<string[]>([]);
  useEffect(() => {
    setRead(readCache<string[]>("estate-read-answers") ?? []);
    const cached = readCache<Partial<EstateDraft>>("estate-listing-draft");
    if (cached) setDraft(Object.fromEntries(Object.entries(EMPTY_DRAFT).map(([key, value]) => [key, cached[key as keyof EstateDraft] ?? value])) as EstateDraft);
  }, []);
  const refresh = useCallback(() => {
    if (!navigator.onLine) return;
    void listings.refresh(); void history.refresh();
  }, [listings.refresh, history.refresh]);
  useEffect(() => {
    const timer = window.setInterval(refresh, 10_000);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  const updateDraft = (key: keyof EstateDraft, value: string) => {
    setDraft(prev => { const next = { ...prev, [key]: value }; writeCache("estate-listing-draft", next); return next; });
  };
  const unread = (history.data?.inquiries ?? []).filter(q => q.answer && !read.includes(q.id)).length;
  async function post(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateEstateSubmission(draft);
    if (validation) { setError(validation); return; }
    setBusy(true); setError("");
    try {
      await submitEstateListing(draft);
      setDraft(EMPTY_DRAFT); writeCache("estate-listing-draft", EMPTY_DRAFT);
      setPosting(false); setTab("mine"); await history.refresh();
      toast.success("ကြော်ငြာပို့ပြီးပါပြီ။ Admin အတည်ပြုရန် စောင့်ဆိုင်းနေပါသည်။");
    } catch { setError("ကြော်ငြာ မပို့နိုင်ပါ။ အင်တာနက်စစ်ပြီး ပြန်ပို့ပါ။"); }
    finally { setBusy(false); }
  }
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !validateEstateInquiry(question)) return;
    setBusy(true); setError("");
    try {
      await submitEstateInquiry(selected.id, question, name);
      setQuestion(""); setSelected(null); setTab("answers"); await history.refresh();
      toast.success("မေးခွန်းပို့ပြီးပါပြီ။");
    } catch { setError("မေးခွန်း မပို့နိုင်ပါ။ ကြော်ငြာနှင့် အင်တာနက်ကို ပြန်စစ်ပါ။"); }
    finally { setBusy(false); }
  }
  function useGps() {
    if (!navigator.geolocation) { setError("ဤဖုန်းတွင် GPS မရနိုင်ပါ။ လိပ်စာကို ရိုက်ထည့်ပါ။"); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(position => {
      const url = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
      updateDraft("location", draft.location.trim() ? `${draft.location.trim()}\n${url}` : url);
      setLocating(false);
    }, () => { setLocating(false); setError("GPS တည်နေရာ မရနိုင်ပါ။ တည်နေရာခွင့်ပြုပြီး ပြန်စမ်းပါ သို့မဟုတ် လိပ်စာ ရိုက်ထည့်ပါ။"); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }
  const fields: { key: keyof EstateDraft; label: string; required?: boolean; max?: number }[] = [
    { key: "guest_name", label: "တင်သူအမည်", required: true, max: 100 },
    { key: "phone", label: "ဆက်သွယ်ရန် ဖုန်း", required: true }, { key: "viber", label: "Viber နံပါတ်" },
  ];
  return <section id="estate" className="space-y-4 border-t border-border pt-6">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-1 flex items-center gap-2 text-primary"><Home className="size-5 shrink-0" /><h2 className="text-lg font-bold leading-relaxed">မိုးညှင်းအိမ်ခြံမြေ</h2></div></div><Button size="icon" variant="outline" aria-label="အိမ်ခြံမြေ အသစ်ရယူရန်" disabled={!online} onClick={refresh}><RefreshCw className="size-4" /></Button></div>
    <Button className="min-h-11 w-full" onClick={() => { setError(""); setPosting(true); }}><Plus className="size-4" />ကြော်ငြာတင်မည်</Button>
    {!online && <p className="text-sm text-muted-foreground">အင်တာနက် မရှိပါ။ သိမ်းထားသော မှတ်တမ်းများကို ပြသနေပါသည်။</p>}
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid h-auto w-full grid-cols-3"><TabsTrigger className="min-h-11 whitespace-normal text-xs" value="listings">ကြော်ငြာများ</TabsTrigger><TabsTrigger className="min-h-11 whitespace-normal text-xs" value="mine">ကျွန်ုပ်ကြော်ငြာ</TabsTrigger><TabsTrigger className="min-h-11 gap-1 whitespace-normal text-xs" value="answers">မေးခွန်း / အဖြေ{unread > 0 && <Badge className="px-1.5">{unread}</Badge>}</TabsTrigger></TabsList>
      <TabsContent value="listings" className="space-y-3">
        <Select value={type} onValueChange={setType}><SelectTrigger aria-label="အိမ်ခြံမြေ အမျိုးအစား"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">အမျိုးအစားအားလုံး</SelectItem>{ESTATE_PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        {listings.loading && !listings.data && <p className="py-6 text-center text-sm text-muted-foreground">ရယူနေသည်…</p>}
        {listings.data?.filter(l => type === "all" || l.property_type === type).map(l => <article key={l.id} className="space-y-3 rounded-lg border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><h3 className="min-w-0 break-words font-bold">{l.title}</h3><Badge variant="secondary" className="shrink-0">{l.property_type}</Badge></div>{Number(l.price) > 0 && <p className="text-lg font-bold text-primary">{Number(l.price).toLocaleString()} ကျပ်</p>}<div className="flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" /><LinkifiedText text={l.location || "—"} className="min-w-0 whitespace-pre-wrap break-words" /></div>{[l.land_type, l.area].some(Boolean) && <p className="text-xs text-muted-foreground">{[l.land_type, l.area].filter(Boolean).join(" · ")}</p>}<Button variant="outline" className="min-h-11 w-full" onClick={() => { setSelected(l); setError(""); setQuestion(""); }}><MessageCircle className="size-4" />အသေးစိတ် / မေးမြန်းမည်</Button></article>)}
        {!listings.loading && !(listings.data ?? []).some(l => type === "all" || l.property_type === type) && <p className="py-8 text-center text-sm text-muted-foreground">အတည်ပြုထားသော ကြော်ငြာ မရှိသေးပါ။</p>}
      </TabsContent>
      <TabsContent value="mine" className="space-y-3">{(history.data?.listings ?? []).map(l => <article key={l.id} className="rounded-lg border border-border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="break-words font-bold">{l.title}</h3><Badge variant={l.status === "rejected" ? "destructive" : "secondary"}>{statusLabels[l.status] ?? l.status}</Badge></div>{Number(l.price) > 0 && <p className="mt-2 text-sm text-primary">{Number(l.price).toLocaleString()} ကျပ်</p>}<LinkifiedText text={l.description} className="mt-2 whitespace-pre-wrap break-words text-sm" /><p className="mt-1 text-xs text-muted-foreground">{time(l.created_at)}</p></article>)}{!history.data?.listings.length && <p className="py-8 text-center text-sm text-muted-foreground">သင့်ကြော်ငြာ မရှိသေးပါ။</p>}</TabsContent>
      <TabsContent value="answers" className="space-y-3">{(history.data?.inquiries ?? []).map(q => <article key={q.id} className="space-y-3 rounded-lg border border-border bg-card p-4"><p className="break-words text-xs font-semibold text-primary">{q.listing_title}</p><p className="whitespace-pre-wrap break-words text-sm">{q.question}</p>{q.answer ? <>{!(q.messages ?? []).some(m => m.body === q.answer) && <div className="border-l-2 border-leaf pl-3 text-sm"><LinkifiedText text={q.answer} className="whitespace-pre-wrap break-words" /></div>}<div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="secondary"><CheckCheck className="mr-1 size-3" />{read.includes(q.id) ? "ဖတ်ပြီး" : "အဖြေအသစ်"}</Badge>{!read.includes(q.id) && <Button variant="ghost" size="sm" onClick={() => { const next = [...read, q.id]; setRead(next); writeCache("estate-read-answers", next); }}>ဖတ်ပြီး မှတ်မည်</Button>}</div></> : <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" />အဖြေစောင့်ဆိုင်းနေပါသည်။</p>}<p className="text-xs text-muted-foreground">{time(q.answered_at ?? q.created_at)}</p><EstateConversation inquiry={q} online={online} onSent={async () => { await history.refresh(); }} /></article>)}{!history.data?.inquiries.length && <p className="py-8 text-center text-sm text-muted-foreground">မေးမြန်းမှု မရှိသေးပါ။</p>}</TabsContent>
    </Tabs>
    <Dialog open={posting} onOpenChange={open => { if (!busy) setPosting(open); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>အိမ်ခြံမြေကြော်ငြာတင်မည်</DialogTitle><DialogDescription>Admin အတည်ပြုပြီးမှ ကြော်ငြာများတွင် ပေါ်ပါမည်။</DialogDescription></DialogHeader><form onSubmit={post} className="space-y-4"><div className="space-y-2"><Label>အိမ်ခြံမြေ အမျိုးအစား</Label><Select value={draft.property_type} onValueChange={value => updateDraft("property_type", value)}><SelectTrigger aria-label="ကြော်ငြာ အမျိုးအစား"><SelectValue /></SelectTrigger><SelectContent>{ESTATE_PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>{fields.map(f => <div key={f.key} className="space-y-2"><Label htmlFor={`estate-${f.key}`}>{f.label}{f.required ? " *" : ""}</Label><Input id={`estate-${f.key}`} required={f.required} maxLength={f.max ?? 500} type={f.key === "phone" || f.key === "viber" ? "tel" : "text"} inputMode={f.key === "phone" || f.key === "viber" ? "tel" : "text"} value={draft[f.key]} onChange={e => updateDraft(f.key, e.target.value)} /></div>)}<div className="space-y-2"><div className="flex items-center justify-between gap-2"><Label htmlFor="estate-location">တည်နေရာ / လိပ်စာ (GPS မထည့်လည်းရပါသည်)</Label><Button type="button" variant="outline" size="icon" aria-label="GPS တည်နေရာ ထည့်မည်" title="GPS တည်နေရာ ထည့်မည်" disabled={locating || busy} onClick={useGps}><MapPin className={`size-4${locating ? " animate-pulse" : ""}`} /></Button></div><Textarea id="estate-location" maxLength={500} rows={3} value={draft.location} onChange={e => updateDraft("location", e.target.value)} /></div><div className="space-y-2"><Label htmlFor="estate-description">အသေးစိတ် အကြောင်းအရာ</Label><Textarea id="estate-description" maxLength={ESTATE_DESCRIPTION_LIMIT} rows={6} value={draft.description} onChange={e => updateDraft("description", e.target.value)} /><p className="text-right text-xs text-muted-foreground" aria-live="polite">{draft.description.length.toLocaleString("my-MM")} / ၁၀၀၀</p></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" className="min-h-11 w-full" disabled={busy || locating || !online}><Send className="size-4" />{busy ? "ပို့နေသည်…" : "ကြော်ငြာပို့မည်"}</Button></form></DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !busy) setSelected(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle className="break-words leading-relaxed">{selected?.title}</DialogTitle><DialogDescription>{selected?.property_type}</DialogDescription></DialogHeader>{selected && <>{Number(selected.price) > 0 && <p className="text-xl font-bold text-primary">{Number(selected.price).toLocaleString()} ကျပ်</p>}<dl className="grid grid-cols-2 gap-3 text-sm">{[["တင်သူအမည်", selected.guest_name], ["မြေအမျိုးအစား", selected.land_type], ["အကျယ်အဝန်း", selected.area], ["အလျား", selected.length], ["အနံ", selected.width]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl><LinkifiedText text={selected.location} className="whitespace-pre-wrap break-words text-sm" /><LinkifiedText text={selected.description} className="whitespace-pre-wrap break-words text-sm" /><div className="text-sm"><LinkifiedText text={`ဖုန်း ${selected.phone}${selected.viber ? ` · Viber ${selected.viber}` : ""}`} /></div><form onSubmit={ask} className="space-y-3 border-t border-border pt-4"><Label htmlFor="estate-ask-name">မေးမြန်းသူအမည်</Label><Input id="estate-ask-name" maxLength={100} value={name} onChange={e => setName(e.target.value)} /><Label htmlFor="estate-question">မေးမြန်းလိုသော အကြောင်းအရာ</Label><Textarea id="estate-question" required maxLength={2000} rows={3} value={question} onChange={e => setQuestion(e.target.value)} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" className="min-h-11 w-full" disabled={busy || !online || !validateEstateInquiry(question)}><Send className="size-4" />{busy ? "ပို့နေသည်…" : "မေးခွန်းပို့မည်"}</Button></form></>}</DialogContent></Dialog>
  </section>;
}