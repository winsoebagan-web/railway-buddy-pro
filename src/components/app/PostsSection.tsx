import { useState } from "react";
import { Facebook, Globe, Music2, Pin, X } from "lucide-react";
import type { Post } from "@/lib/data";
import { isFresh, mmRelative } from "@/lib/mm";

function PostLinks({ post, size = "size-4" }: { post: Post; size?: string }) {
  return (
    <>
      {post.facebook_url ? (
        <a
          href={post.facebook_url}
          target="_blank"
          rel="noreferrer"
          aria-label="Facebook"
          onClick={(e) => e.stopPropagation()}
        >
          <Facebook className={`${size} text-primary`} />
        </a>
      ) : null}
      {post.tiktok_url ? (
        <a
          href={post.tiktok_url}
          target="_blank"
          rel="noreferrer"
          aria-label="TikTok"
          onClick={(e) => e.stopPropagation()}
        >
          <Music2 className={`${size} text-secondary-foreground`} />
        </a>
      ) : null}
      {post.website_url ? (
        <a
          href={post.website_url}
          target="_blank"
          rel="noreferrer"
          aria-label="Website"
          onClick={(e) => e.stopPropagation()}
        >
          <Globe className={`${size} text-sun-foreground`} />
        </a>
      ) : null}
    </>
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
                <PostLinks post={post} />
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
            <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-card px-4 py-3">
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
                <PostLinks post={active} size="size-5" />
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
