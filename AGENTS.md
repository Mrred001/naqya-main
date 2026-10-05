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

- Content reads go through shared queryOptions in src/lib/content.ts (browser client, public RLS reads); keeps every page on one cached query.
- Curator writes happen client-side, enforced by RLS via has_role('admin'); first signed-up account becomes admin through a DB trigger, so no service-key code exists.
