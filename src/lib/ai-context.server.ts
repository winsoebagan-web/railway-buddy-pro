import { createClient } from "@supabase/supabase-js";

export async function buildContext() {
  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const [trains, stops, demu, info] = await Promise.all([
    sb.from("trains").select("*").eq("is_visible", true).order("sort_order"),
    sb.from("train_stops").select("*").order("stop_order"),
    sb.from("demu_schedules").select("*").order("sort_order"),
    (sb as any).from("ai_info").select("category,title,content,updated_at").eq("is_visible", true).order("sort_order"),
  ]);
  const lines: string[] = [];
  for (const t of (trains.data ?? []) as any[]) {
    lines.push(
      `## ရထားအမှတ် ${t.number} ${t.name} (${t.origin} → ${t.destination}, ထွက် ${t.depart_time ?? "-"}${t.has_upper_class ? ", အထက်တန်းရှိ" : ""})`,
    );
    for (const s of ((stops.data ?? []) as any[]).filter((x) => x.train_id === t.id)) {
      if (!s.stops) {
        lines.push(`- ${s.station_name}: မရပ်`);
        continue;
      }
      lines.push(
        `- ${s.station_name}: ဆိုက် ${s.arrive_time ?? "-"} ထွက် ${s.depart_time ?? "-"} ရိုးရိုး ${s.fare_ordinary ?? "-"}${t.has_upper_class ? ` အထက် ${s.fare_upper ?? "-"}` : ""}${s.note ? ` (${s.note})` : ""}`,
      );
    }
  }
  const d = (demu.data ?? []) as any[];
  if (d.length) {
    lines.push("## DEMU ရထားများ");
    for (const r of d) {
      const { id, created_at, updated_at, sort_order, ...rest } = r;
      lines.push(`- ${JSON.stringify(rest)}`);
    }
  }
  const names: Record<string, string> = {
    electricity: "လျှပ်စစ်မီးသတင်း",
    road: "ကားလမ်းသတင်း",
    phone: "ဖုန်းအင်တာနက်သတင်း",
  };
  const groups = new Map<string, any[]>();
  for (const x of (info.data ?? []) as any[]) {
    const list = groups.get(x.category) ?? [];
    list.push(x);
    groups.set(x.category, list);
  }
  for (const [cat, items] of groups) {
    lines.push(`## ${names[cat] ?? cat}`);
    for (const x of items)
      lines.push(`- ${x.title ? `[${x.title}] ` : ""}(${String(x.updated_at ?? "").slice(0, 10)}) ${x.content}`);
  }
  return lines.join("\n");
}
