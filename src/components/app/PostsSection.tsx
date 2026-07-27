import { Facebook, Globe, Music2, Pin } from "lucide-react";
import type { Post } from "@/lib/data";
import { isFresh, mmRelative } from "@/lib/mm";

export function PostsSection({ posts }: { posts: Post[] }) {
  const visible = posts.filter((p) => p.is_visible && (p.is_pinned || isFresh(p.created_at, 8)));

  if (visible.length === 0) {
    return (
      <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        သတင်းအသစ် မရှိသေးပါ။
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {visible.map((post) => (
        <article
          key={post.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card"
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
              {post.is_pinned ? <Pin className="mt-0.5 size-3.5 shrink-0 text-sun-foreground" /> : null}
              <h3 className="line-clamp-2 text-sm font-bold text-primary">{post.title}</h3>
            </div>
            <p className="line-clamp-6 whitespace-pre-wrap text-xs text-foreground/85">{post.body}</p>
            <div className="mt-auto flex items-center gap-2 pt-2">
              {post.facebook_url ? (
                <a href={post.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook">
                  <Facebook className="size-4 text-primary" />
                </a>
              ) : null}
              {post.tiktok_url ? (
                <a href={post.tiktok_url} target="_blank" rel="noreferrer" aria-label="TikTok">
                  <Music2 className="size-4 text-secondary-foreground" />
                </a>
              ) : null}
              {post.website_url ? (
                <a href={post.website_url} target="_blank" rel="noreferrer" aria-label="Website">
                  <Globe className="size-4 text-sun-foreground" />
                </a>
              ) : null}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {mmRelative(post.created_at)}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
