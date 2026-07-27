const MM_DIGITS = ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"];

export function mmNum(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).replace(/[0-9]/g, (d) => MM_DIGITS[Number(d)]);
}

export function mmMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${mmNum(value.toLocaleString("en-US"))} ကျပ်`;
}

/** "13:15" -> "၀၁း၁၅ မွန်းလွဲ" */
export function mmTime(hhmm: string | null | undefined): string {
  if (!hhmm) return "—";
  const [hRaw, mRaw] = hhmm.split(":");
  const h = Number(hRaw);
  const m = mRaw ?? "00";
  if (Number.isNaN(h)) return hhmm;

  let label = "မနက်";
  if (h === 12) label = "မွန်းတည့်";
  else if (h > 12 && h < 16) label = "မွန်းလွဲ";
  else if (h >= 16 && h < 19) label = "ညနေ";
  else if (h >= 19) label = "ည";
  else if (h < 5) label = "မနက်စောစော";

  const h12 = h % 12 === 0 ? 12 : h % 12;
  const hh = String(h12).padStart(2, "0");
  return `${mmNum(hh)}း${mmNum(m)} ${label}`;
}

export function minutesOf(hhmm: string | null | undefined): number {
  if (!hhmm) return -1;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return -1;
  return h * 60 + (m || 0);
}

export function mmRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return "ခုနက";
  if (mins < 60) return `${mmNum(mins)} မိနစ်က`;
  const hrs = Math.floor(mins / 60);
  return `${mmNum(hrs)} နာရီက`;
}

export function isFresh(iso: string, hours: number): boolean {
  return Date.now() - new Date(iso).getTime() < hours * 3600_000;
}
