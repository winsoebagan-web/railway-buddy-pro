import { useEffect, useState } from "react";
import type { SplashSlide } from "@/lib/data";

export function Splash({ slides }: { slides: SplashSlide[] }) {
  const visible = slides.filter((s) => s.is_visible);
  const [show, setShow] = useState(visible.length > 0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!show || visible.length === 0) return;
    const perSlide = 5000 / visible.length;
    const step = window.setInterval(() => setIndex((i) => i + 1), perSlide);
    const done = window.setTimeout(() => setShow(false), 5000);
    return () => {
      window.clearInterval(step);
      window.clearTimeout(done);
    };
  }, [show, visible.length]);

  if (!show || visible.length === 0) return null;
  const slide = visible[Math.min(index, visible.length - 1)];

  return (
    <div
      className="surface-header fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 px-8 text-center"
      onClick={() => setShow(false)}
    >
      {slide.image_url ? (
        <img
          src={slide.image_url}
          alt={slide.text}
          className="animate-splash max-h-56 w-auto rounded-2xl object-contain shadow-card"
        />
      ) : (
        <div className="animate-splash text-6xl">🚆</div>
      )}
      <h1 className="animate-splash text-2xl font-bold text-primary-foreground drop-shadow">
        {slide.text}
      </h1>
      {slide.subtext ? (
        <p className="animate-splash max-w-sm text-sm text-primary-foreground/90">{slide.subtext}</p>
      ) : null}
      <div className="mt-4 flex gap-1.5">
        {visible.map((s, i) => (
          <span
            key={s.id}
            className={`h-1.5 rounded-full bg-primary-foreground transition-all ${
              i === Math.min(index, visible.length - 1) ? "w-6 opacity-100" : "w-1.5 opacity-50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
