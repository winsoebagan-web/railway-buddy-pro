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
- Keep AI provider calls and secrets server-only; automatic failures persist pause/cooldown state and never rotate models or credentials to bypass a denial.
