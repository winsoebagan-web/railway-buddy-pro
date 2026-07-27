#!/usr/bin/env node
/**
 * Produces a purely static SPA in `dist/` (dist/index.html + assets) from the
 * client build, so the output can be synced straight into Capacitor.
 *
 * Usage: node scripts/build-static.mjs   (run after `vite build`)
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const client = join(dist, "client");

if (!existsSync(client)) {
  console.error("[static] dist/client not found — run `vite build` first.");
  process.exit(1);
}

const assets = readdirSync(join(client, "assets"));
const entry = assets.find((f) => f.startsWith("index-") && f.endsWith(".js"));
const css = assets.filter((f) => f.endsWith(".css"));

if (!entry) {
  console.error("[static] Could not find the client entry chunk in dist/client/assets.");
  process.exit(1);
}

// Flatten dist/client/* into dist/ and drop the server bundle.
for (const item of readdirSync(client)) {
  cpSync(join(client, item), join(dist, item), { recursive: true });
}
for (const item of ["client", "server", "nitro.json", "package.json", "package-lock.json"]) {
  rmSync(join(dist, item), { recursive: true, force: true });
}
mkdirSync(dist, { recursive: true });

const html = `<!DOCTYPE html>
<html lang="my">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>မိုးညှင်း ရထားခရီးစဉ် | အချိန်ဇယားနှင့် လက်မှတ်ခ</title>
    <meta
      name="description"
      content="မိုးညှင်း ရထားခရီးစဉ်များ၏ အချိန်ဇယား၊ ဘူတာစာရင်းနှင့် လက်မှတ်ခများကို အလွယ်တကူ ရှာဖွေကြည့်ရှုပါ။"
    />
    <meta property="og:title" content="မိုးညှင်း ရထားခရီးစဉ်" />
    <meta property="og:description" content="ရထားအချိန်၊ ဘူတာနှင့် လက်မှတ်ခ အချက်အလက်များ။" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.ico" type="image/x-icon" />
${css.map((f) => `    <link rel="stylesheet" href="/assets/${f}" />`).join("\n")}
  </head>
  <body>
    <script type="module" src="/assets/${entry}"></script>
  </body>
</html>
`;

writeFileSync(join(dist, "index.html"), html, "utf8");
console.log(`[static] dist/index.html written (entry: assets/${entry})`);
