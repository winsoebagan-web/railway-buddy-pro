import { useState } from "react";
import { MapPin, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Report, Station, TrainWithStops } from "@/lib/data";
import { isFresh, mmRelative } from "@/lib/mm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function ReportsSection({
  reports,
  stations,
  trains,
  onChanged,
}: {
  reports: Report[];
  stations: Station[];
  trains: TrainWithStops[];
  onChanged: () => void;
}) {
  const [station, setStation] = useState("");
  const [train, setTrain] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const fresh = reports.filter((r) => isFresh(r.created_at, 1));

  async function submit() {
    if (!station || !train) {
      toast.error("ဘူတာနှင့် ရထားကို ရွေးပါ။");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      station_name: station,
      train_name: train,
      report_time: time,
      note: note.slice(0, 300) || null,
    });
    setBusy(false);
    if (error) {
      toast.error("မတင်ပြနိုင်ပါ။ အင်တာနက် စစ်ဆေးပါ။");
      return;
    }
    toast.success("တင်ပြပြီးပါပြီ။ ၁ နာရီကြာ ပြသပါမည်။");
    setNote("");
    setTime("");
    onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="mb-3 text-sm font-bold text-primary">ရထားရောက်ရှိမှု တင်ပြရန်</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={station} onValueChange={setStation}>
            <SelectTrigger>
              <SelectValue placeholder="ရောက်ရှိဘူတာ" />
            </SelectTrigger>
            <SelectContent>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={train} onValueChange={setTrain}>
            <SelectTrigger>
              <SelectValue placeholder="ရထားအမျိုးအစား" />
            </SelectTrigger>
            <SelectContent>
              {trains.map((t) => (
                <SelectItem key={t.id} value={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          className="mt-2"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="ဘူတာအချိန်"
        />
        <Textarea
          className="mt-2"
          maxLength={300}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="မှတ်ချက် (မဖြစ်မနေ မဟုတ်ပါ)"
        />
        <Button className="mt-2 w-full" onClick={submit} disabled={busy}>
          <Send className="size-4" /> တင်ပြမည်
        </Button>
      </div>

      {fresh.length === 0 ? (
        <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          လက်ရှိတွင် တင်ပြချက် မရှိသေးပါ။
        </p>
      ) : (
        fresh.map((r) => (
          <div key={r.id} className="rounded-xl border border-leaf/40 bg-leaf-soft/50 p-3 text-sm">
            <div className="flex items-center gap-1.5 font-bold text-secondary-foreground">
              <MapPin className="size-4" /> {r.station_name}
            </div>
            <div className="text-xs text-foreground/80">{r.train_name}</div>
            {r.report_time ? <div className="text-xs">အချိန် — {r.report_time}</div> : null}
            {r.note ? <p className="mt-1 text-xs">{r.note}</p> : null}
            <div className="mt-1 text-[11px] text-muted-foreground">{mmRelative(r.created_at)}</div>
          </div>
        ))
      )}
    </div>
  );
}
