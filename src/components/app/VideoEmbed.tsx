/** Renders any video URL: YouTube / Facebook / TikTok / Vimeo embeds, or a direct file. */

export function embedUrl(raw: string): string | null {
  const url = (raw ?? "").trim();
  if (!url) return null;

  const yt =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  if (/vimeo\.com\/(\d+)/i.test(url)) {
    const id = url.match(/vimeo\.com\/(\d+)/i)![1];
    return `https://player.vimeo.com/video/${id}`;
  }

  if (/facebook\.com|fb\.watch/i.test(url)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
  }

  const tt = url.match(/tiktok\.com\/.*\/video\/(\d+)/i);
  if (tt) return `https://www.tiktok.com/embed/v2/${tt[1]}`;

  return null;
}

export function VideoEmbed({ url, title }: { url: string; title?: string }) {
  const embed = embedUrl(url);

  if (embed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={embed}
          title={title || "video"}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <video controls playsInline preload="metadata" src={url} className="w-full rounded-xl bg-black">
      <track kind="captions" />
    </video>
  );
}
