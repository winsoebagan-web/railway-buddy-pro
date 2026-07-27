import type { Audio } from "@/lib/data";

export function AudioSection({ audios }: { audios: Audio[] }) {
  const visible = audios.filter((a) => a.is_visible).slice(0, 5);

  if (visible.length === 0) {
    return (
      <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">အသံဖိုင် မရှိသေးပါ။</p>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((a) => (
        <div key={a.id} className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <p className="mb-2 text-sm font-bold text-primary">{a.title || "အသံဖိုင်"}</p>
          <audio controls preload="none" src={a.url} className="w-full">
            <track kind="captions" />
          </audio>
        </div>
      ))}
    </div>
  );
}
