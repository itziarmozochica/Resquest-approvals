# Product Marketing (`product-marketing`)

Angular library for **one-time partner-admin announcements**: it decides _whether_ a partner admin
should be shown an announcement, opens the host's component in a dialog, and records the view so it
never shows again. The backend carries only keys and targeting — **all content lives in host code**.

It exists to replace per-browser `localStorage` splash flags with a server-backed, per-admin seen
store, so an announcement follows the person rather than the browser.

> **Working on the code?** Read [`AGENTS.md`](AGENTS.md) first — it holds the invariants that are
> easy to break by accident. This README is about consuming the library.

---

## Package facts

| Item             | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| Type             | Angular **library** (`projectType: library`)                   |
| Path alias       | `product-marketing` → [`src/public-api.ts`](src/public-api.ts) |
| Public API entry | [`src/public-api.ts`](src/public-api.ts)                       |
| Angular          | 18.2                                                           |
| Tests            | `pnpm --filter product-marketing test`                         |

Nothing under `src/lib/**` is public beyond what `public-api.ts` re-exports.

---

## What the host has to do

`provideOneTimeAnnouncements()` registers the flow; the announcement starts itself through an
`ENVIRONMENT_INITIALIZER`, so there is no `start()` to call.

```ts
// app.module.ts (or an ApplicationConfig) — root providers, not a lazy route's
providers: [
  ...provideOneTimeAnnouncements([{ key: 'reservations-deposits', component: DepositsAnnouncementComponent }]),
  { provide: ANNOUNCEMENTS_API, useExisting: MyAnnouncementsApiService },
  { provide: ANNOUNCEMENTS_CONTEXT, useExisting: MyAnnouncementsContextService },
  { provide: STORAGE_SERVICE, useExisting: LocalStorageService },
];
```

Two constraints the snippet cannot show on its own:

- **They go in the root providers.** Not a preference: a second injector means a second service,
  both opening the same announcement. A root-scoped latch stops the duplicate, so the failure of
  getting this wrong is silent rather than visible.
- **All announcements go in one call.** `ANNOUNCEMENT_REGISTRATIONS` is a `multi` token, and multi
  providers merge only within a single injector — registering a second announcement in a lazy
  route's providers shadows the root set instead of adding to it.

### The three ports

| Port                    | Required?   | What the host supplies                                                                                                  |
| ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ANNOUNCEMENTS_API`     | **Yes**     | `getEligibleAnnouncements()` and `markSeen(key)` against your backend.                                                  |
| `ANNOUNCEMENTS_CONTEXT` | **Yes**     | `context$`, emitting a partner-admin context when someone is eligible and `null` when nobody is.                        |
| `ANNOUNCEMENTS_DIALOG`  | No          | Defaults to Ignite's `IgntDialogService` at modal size `lg`. Override only for a different size or a non-Ignite dialog. |
| `STORAGE_SERVICE`       | In practice | The anti-flash cache. Always resolvable, but its default is **in-memory** — see below.                                  |

`STORAGE_SERVICE` is the one to watch: an unbound host gets no error, just a cache that resets on
every page load. That quietly weakens the guarantee below — a failed "mark seen" is only safe
because the local cache prevents the re-show, and with in-memory storage that holds for one page
session, not across a reload.

The registered component receives an `IGNT_DIALOG_REF` under the default dialog, so it can dismiss
itself.

### The context contract

Emitting a context means "this partner admin is eligible **now**". The host owns the exclusions —
who counts as eligible is a product decision, not a library one — and emits `null` for everyone
else. `null` is meaningful: it cancels an announcement that is currently on screen.

---

## What the library guarantees

- **Once per admin, not once per browser.** The seen store is per admin server-side, and the local
  anti-flash cache is keyed the same way.
- **Fails closed.** Any endpoint error results in no announcement rather than a broken screen. A
  failed "mark seen" is tolerated, because the local cache already prevents a re-show.
- **Dialogs never stack.** Announcements are shown one at a time, and an undismissed dialog is
  closed if the session it belongs to ends.
- **Nothing happens without a registration.** With an empty registry the flow does no work at all —
  it does not even subscribe to context.
- **It emits analytics on its own.** `announcementImpressionEvent` on open and
  `announcementDismissedEvent` on dismissal, so a host gets impression and dismissal tracking
  without asking for it. `FzTrackingService` is injected `{ optional: true }`: a host that has not
  wired tracking silently gets none, which tends to be discovered from an empty dashboard rather
  than from an error.

---

## Adding an announcement

1. Build the component. It only owns its own content and dismissal.
2. Register it in the host's `provideOneTimeAnnouncements([...])` array against its key.
3. Make sure the backend has that key **enabled and targeted**. A registered key with no enabled
   row shows nothing, and an enabled row with no registered component is ignored.

Both halves are required: the key is the contract between them.
