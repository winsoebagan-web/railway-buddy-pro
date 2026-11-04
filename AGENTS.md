<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Admin auto-reply runs from the authenticated dashboard across all tabs; the server owns a database lease, knowledge revision and capped per-question progress so multiple dashboards cannot duplicate AI work.
- Automatic sweeps respect the global AI switch; explicit per-question Admin actions may run with that switch off, and conditional answer writes preserve concurrent manual replies.
- Explicit Admin AI requests are persisted on each question before lease acquisition; dashboard sweeps prioritize them through transient cooldowns without another tap, and terminal failures clear the request without replay.
- Keep AI provider calls and secrets server-only; automatic failures persist pause/cooldown state and never rotate models or credentials to bypass a denial.
- Estate listings and comments use separate RLS-protected tables; linked estate inquiries reuse the existing AI question lease and timer to preserve one-tap queue safety, with approved per-listing context and a revision recheck before saving. Railway inbox queries exclude linked estate inquiries.
- Phone estate submissions write directly to the database; private guest history uses a random receipt secret whose hash is stored on rows and verified by a narrowly scoped RPC, never a public device ID. Browser copies are offline caches only.
