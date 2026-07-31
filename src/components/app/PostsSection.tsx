import { useState } from "react";
import { Facebook, Globe, Music2, Pin, X } from "lucide-react";
import type { Post } from "@/lib/data";
import { isFresh, mmRelative } from "@/lib/mm";

function normalizeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function LinkChip({
  href,
  label,
  color,
  icon: Icon,
  compact,
}: {
  href: string;
  label: string;
  color: string;
  icon: typeof Facebook;
  compact?: boolean;
}) {
  return (
    <a
      href={normalizeUrl(href)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ color, borderColor: color }}
      className={`inline-flex items-center gap-1 rounded-full border bg-card font-semibold ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      <Icon className={compact ? "size-3" : "size-4"} />
      {label}
    </a>
  );
}

export function PostLinks({ post, compact }: { post: Post; compact?: boolean }) {
  const color = post.link_color || "hsl(var(--primary))";
  const items = [
    { url: post.facebook_url, label: post.facebook_label || "Facebook", icon: Facebook },
    { url: post.tiktok_url, label: post.tiktok_label || "TikTok", icon: Music2 },
    { url: post.website_url, label: post.website_label || "Website", icon: Globe },
  ].filter((i) => i.url);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((i) => (
        <LinkChip
          key={i.label}
          href={i.url as string}
          label={i.label}
          color={color}
          icon={i.icon}
          compact={compact}
        />
      ))}
    </div>
  );
}

export function PostsSection({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<Post | null>(null);
  const visible = posts.filter((p) => p.is_visible && (p.is_pinned || isFresh(p.created_at, 8)));

  if (visible.length === 0) {
    return (
      <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        သတင်းအသစ် မရှိသေးပါ။
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {visible.map((post) => (
          <article
            key={post.id}
            role="button"
            tabIndex={0}
            onClick={() => setActive(post)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActive(post);
              }
            }}
            className="flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition active:scale-[0.98]"
          >
            {post.image_url ? (
              <img
                src={post.image_url}
                alt={post.title || "ပို့စ်ပုံ"}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="surface-soft flex aspect-square w-full items-center justify-center text-3xl">
                🚆
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1 p-3">
              <PostLinks post={post} compact />
              <div className="flex items-start gap-1">
                {post.is_pinned ? (
                  <Pin className="mt-0.5 size-3.5 shrink-0 text-sun-foreground" />
                ) : null}
                <h3 className="line-clamp-2 text-sm font-bold text-primary">{post.title}</h3>
              </div>
              <p className="line-clamp-3 whitespace-pre-wrap text-xs text-foreground/85">
                {post.body}
              </p>
              <div className="mt-auto flex items-center gap-2 pt-2">
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {mmRelative(post.created_at)}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-primary">အသေးစိတ်ကြည့်ရန် →</span>
            </div>
          </article>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/60 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card shadow-card sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 space-y-2 border-b border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="flex-1 text-sm font-bold text-primary">{active.title}</h3>
                <button
                  type="button"
                  aria-label="ပိတ်ရန်"
                  onClick={() => setActive(null)}
                  className="rounded-full bg-muted p-1.5 text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <PostLinks post={active} />
            </div>
            {active.image_url ? (
              <img
                src={active.image_url}
                alt={active.title || "ပို့စ်ပုံ"}
                className="w-full object-contain"
              />
            ) : null}
            <div className="space-y-3 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {active.body}
              </p>
              <div className="flex items-center gap-3 border-t border-border pt-3">
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {mmRelative(active.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
