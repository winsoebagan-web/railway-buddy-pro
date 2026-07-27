import { useState } from "react";
import { MessageSquareHeart, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Suggestion } from "@/lib/data";
import { isFresh, mmNum, mmRelative } from "@/lib/mm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function SuggestionsSection({
  suggestions,
  onChanged,
}: {
  suggestions: Suggestion[];
  onChanged: () => void;
}) {
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const fresh = suggestions.filter((s) => isFresh(s.created_at, 5));

  async function submit() {
    const text = message.trim().slice(0, 300);
    if (!text) {
      toast.error("အကြံပြုချက် ရေးပါ။");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("suggestions")
      .insert({ author: author.trim() || null, message: text });
    setBusy(false);
    if (error) {
      toast.error("မတင်နိုင်ပါ။ အင်တာနက် စစ်ဆေးပါ။");
      return;
    }
    toast.success("ကျေးဇူးတင်ပါသည်။ ၅ နာရီကြာ ပြသပါမည်။");
    setMessage("");
    onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="mb-3 text-sm font-bold text-primary">အကြံပြုလွှာ တင်ရန်</p>
        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="အမည် (မထည့်လည်းရပါသည်)"
        />
        <Textarea
          className="mt-2"
          rows={3}
          maxLength={300}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="အကြံပြုချက် (စာလုံးရေ ၃၀၀ အထိ)"
        />
        <div className="mt-1 text-right text-[11px] text-muted-foreground">
          {mmNum(message.length)} / {mmNum(300)}
        </div>
        <Button className="mt-1 w-full" onClick={submit} disabled={busy}>
          <Send className="size-4" /> တင်မည်
        </Button>
      </div>

      {fresh.length === 0 ? (
        <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          အကြံပြုချက် မရှိသေးပါ။
        </p>
      ) : (
        fresh.map((s) => (
          <div key={s.id} className="rounded-xl border border-primary/25 bg-sky-soft/60 p-3 text-sm">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <MessageSquareHeart className="size-4" /> {s.author || "အမည်မဖော်လိုသူ"}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-xs">{s.message}</p>
            <div className="mt-1 text-[11px] text-muted-foreground">{mmRelative(s.created_at)}</div>
          </div>
        ))
      )}
    </div>
  );
}
