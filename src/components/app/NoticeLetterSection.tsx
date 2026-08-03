import { Mail } from "lucide-react";
import type { NoticeLetter } from "@/lib/data";
import { liveStyleClass } from "@/components/app/LiveBoard";

export function NoticeLetterSection({ rows }: { rows?: NoticeLetter[] | null }) {
  const list = (rows ?? [])
    .filter((r) => r.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (list.length === 0) return null;

  return (
    <div className="space-y-2">
      {list.map((n) => (
        <div
          key={n.id}
          className="overflow-hidden rounded-2xl border border-leaf/40 bg-leaf-soft/40 p-3"
        >
          <div className="mb-1 flex items-center gap-1.5 text-sm font-bold" style={{ color: n.color }}>
            <Mail className="size-4" />
            <span className={liveStyleClass(n.style)}>{n.title}</span>
          </div>
          <p
            className={`whitespace-pre-line text-sm font-medium ${liveStyleClass(n.style)}`}
            style={{ color: n.color }}
          >
            {n.body}
          </p>
        </div>
      ))}
    </div>
  );
}
