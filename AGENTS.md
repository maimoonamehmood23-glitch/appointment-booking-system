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

## Architecture rules

- All database access goes through server functions in `src/lib/booking.functions.ts` using the admin client loaded inside handlers — the browser never queries `bookings` directly, because there is no user auth to scope RLS by.
- Admin access is a shared-password gate: `ADMIN_PASSWORD` compared timing-safely inside a server function, unlocked state stored in an encrypted session cookie signed with `SESSION_SECRET`.
- Slot availability is derived: `time_slots` (per day of week) minus non-cancelled `bookings`, enforced by a partial unique index so double-booking fails at the database.
