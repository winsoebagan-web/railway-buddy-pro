import React from "react";

// Detects URLs (http/https, www., facebook/fb/tiktok short links) and phone numbers
// (09..., +959..., 959...) in plain text and renders them as touch-friendly links.
const RE =
  /(https?:\/\/[^\s<>"'）】」]+|www\.[^\s<>"'）】」]+|(?:\+?95|0)\d{7,10})/g;

function clean(raw: string): { text: string; trailing: string } {
  // strip trailing punctuation that isn't part of the link
  const m = raw.match(/^(.*?)([.,;:!?၊။]+)?$/);
  return { text: m?.[1] ?? raw, trailing: m?.[2] ?? "" };
}

function hrefFor(url: string): { href: string; app?: string } {
  const u = url.startsWith("http") ? url : `https://${url}`;
  try {
    const host = new URL(u).hostname.replace(/^www\./, "").toLowerCase();
    // Facebook: try the native app first via intent-style fallback
    if (host === "facebook.com" || host === "m.facebook.com" || host === "fb.com" || host === "fb.me" || host === "fb.watch") {
      return { href: u };
    }
    if (host === "tiktok.com" || host.endsWith(".tiktok.com") || host === "vt.tiktok.com" || host === "vm.tiktok.com") {
      return { href: u };
    }
    return { href: u };
  } catch {
    return { href: u };
  }
}

function phoneHref(num: string): string {
  let d = num.replace(/[^\d+]/g, "");
  if (d.startsWith("0")) d = "+95" + d.slice(1);
  else if (d.startsWith("95")) d = "+" + d;
  else if (!d.startsWith("+")) d = "+" + d;
  return `tel:${d}`;
}

const linkCls =
  "font-semibold text-primary underline decoration-2 underline-offset-2 break-all active:opacity-70";
const phoneCls =
  "inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1 font-semibold text-primary break-all active:opacity-70";

export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const { text: token, trailing } = clean(m[0]);
    if (/^(?:\+?95|0)\d{7,10}$/.test(token)) {
      const tel = phoneHref(token);
      out.push(
        <a key={key++} href={tel} className={phoneCls} aria-label={`ဖုန်းခေါ်ရန် ${token}`}>
          📞 {token}
        </a>,
      );
    } else {
      const { href } = hrefFor(token);
      out.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkCls}
        >
          {token}
        </a>,
      );
    }
    if (trailing) out.push(trailing);
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <span className={className}>{out}</span>;
}
