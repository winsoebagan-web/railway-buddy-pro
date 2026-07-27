import type { Marquee } from "@/lib/data";

export function MarqueeBar({ items, position }: { items: Marquee[]; position: "top" | "bottom" }) {
  const rows = items.filter((m) => m.is_visible && m.position === position);
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col">
      {rows.map((row) => (
        <div
          key={row.id}
          className="overflow-hidden border-y border-border/60 bg-card/80 py-1.5 backdrop-blur"
        >
          <p
            className="animate-marquee whitespace-nowrap px-4 text-sm font-semibold"
            style={{ color: row.color }}
          >
            {row.text}
          </p>
        </div>
      ))}
    </div>
  );
}
