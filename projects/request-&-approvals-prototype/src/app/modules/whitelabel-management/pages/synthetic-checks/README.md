# Synthetic Checks Page

**Tickets:** PARTNERS-9567 (the page), PARTNERS-10806 (the open check in the URL, both directions), PARTNERS-10803 (bulk pause and delete), PARTNERS-11285 (monitoring settings)
**Feature flag:** `WL_ENABLE_SYNTHETIC_CHECKS`
**Route:** `/whitelabels/synthetic-checks/:id` (`:id` = whitelabel ID), optionally `?check_id={checkId}`

## Folder layout

```
pages/synthetic-checks/
├── models/              ← TypeScript interfaces (API + UI shapes)
├── data/                ← HTTP service + snake_case→camelCase mappers
├── facades/             ← (Phase 2) state orchestration
├── ui/                  ← (Phase 2) container + presentational components
└── README.md
```

## API endpoints

Base: `${apiGWBaseUrl}/1.0/partners/${partnerId}/whitelabels/${whitelabelId}/synthetic-checks`

| Method | Sub-path                    | Purpose                                                    |
| ------ | --------------------------- | ---------------------------------------------------------- |
| GET    | (root)                      | Paginated check list (each row embeds `latest_result`)     |
| GET    | `/summary`                  | Whitelabel summary stats                                   |
| GET    | `/{checkId}`                | One check by id (deep link; `latest_result` always `null`) |
| GET    | `/{checkId}/results/latest` | Latest result for one check (deep link only)               |
| PATCH  | `/{checkId}/toggle`         | Toggle `enabled` flag                                      |
| DELETE | `/{checkId}`                | Delete a check (204)                                       |
| POST   | (root)                      | Create a check                                             |
| PUT    | `/{checkId}`                | Update a check (same body as POST)                         |
| POST   | `/baseline`                 | Start a baseline sync (**202**)                            |
| GET    | `/baseline/{jobId}`         | Poll a baseline sync's status                              |
| POST   | `/bulk/set-enabled`         | Pause / resume up to 100 checks (`200`, per-id outcome)    |
| POST   | `/bulk/delete`              | Delete up to 100 checks (`200`, per-id outcome)            |
| GET    | `/monitoring-config`        | Whitelabel-level switches and their last changes           |
| PATCH  | `/monitoring-config`        | Change one switch (`enabled` or `auto_sync`)               |

## List filtering (server-side)

The list endpoint takes `page`, `page_size`, `sort`, `enabled`, `failing_only`, and — since
PARTNERS-10802 — `search` and `check_type`. All of them are **server-side**: the list is paginated by
infinite scroll, so filtering only what is loaded would silently hide matches further down and make
the reported total wrong.

`search` is a case-insensitive substring on a check's name **or** URL, trimmed, capped at 255
characters (the API's `max_length`, enforced on the input so the 422 is unreachable), and sent raw —
the API escapes `LIKE` metacharacters itself. `check_type` is exactly `uptime` or `transactional`;
the UI's `all` state is the absence of the param.

Every filter has two halves in `SyntheticChecksFacade`, and both are load-bearing: `#filterOptions()`
builds the query params and `#restartPagination()` reloads from page 1, while `#matchesFilters()`
re-applies the same predicate client-side so a row mutated locally (renamed, toggled) leaves a
filtered list at once instead of lingering until the next refetch. Adding a filter means adding both.

See [`plans/PARTNERS/PARTNERS-10802_synthetic-checks-search-and-type-filter.md`](../../../../../../plans/PARTNERS/PARTNERS-10802_synthetic-checks-search-and-type-filter.md).

## Baseline sync (asynchronous)

"Create baseline checks" runs the same reconciliation as the daily `b2b-synthetic-tests-plan-sync`
CronJob, scoped to this whitelabel: it creates the checks missing for the whitelabel's plans,
re-enables checks whose plan is available again, and **disables** checks whose plan went sold-out or
was delisted. The `fullReset` option (the "Overwrite" checkbox in the confirm dialog) deletes the
whitelabel's existing plan-sync-authored checks first; hand-made checks are never touched.

The API is asynchronous and the UI has to treat it that way: the sync does roughly two storefront
probes per plan, so the largest whitelabel takes minutes — far past the gateway's 30s read timeout.
The POST returns **202** with a job, and `SyntheticChecksFacade.startBaselineSync()` polls
`/baseline/{jobId}` every 3s, emitting **once** when the job reaches a terminal status. Terminal
means `succeeded`, `failed`, or `lost` — `lost` is the synthetics API pod having restarted mid-run,
so nothing is corrupted but the sync did not finish and can be re-run. An unreadable status degrades
in opposite directions per call site: the job body on the **202** becomes `running`, so the caller
polls for the real outcome rather than calling an accepted sync failed and sending the user into a
retry the server answers `409`; a status **poll** becomes `failed`, which is terminal and stops the
UI polling forever.

Only one sync per whitelabel may be in flight; a second POST returns **409**. The service turns that
one status into a `BaselineSyncAlreadyRunningError` (`models/baseline-sync-job.model.ts`) so the page
can tell "someone's sync is already running fine" from "the sync broke" without reading
`HttpErrorResponse.status`; every other failure propagates as the raw transport error.

Polling gives up early rather than burning the whole budget when the status cannot be read: a 4xx
other than `408`/`429` is permanent for that job (it was pruned, or is not ours to read), and four
consecutive failures of any kind mean the status endpoint is not answering. The 35-minute backstop is
counted in **ticks**, not wall clock, so a sleeping laptop cannot fail a sync that actually finished.

The checks list is reloaded however the sync terminates — a terminal status, a permanent read
failure, an exhausted poll budget, or the `409` — because the sync runs server-side whatever the poll
manages to observe, and a table left showing pre-sync state is the worse outcome. For the same
reason an **empty** list falls back to a 60s idle refetch rather than not refetching at all, so
checks that appear server-side (this sync, or another user) show up without a manual reload.

## Bulk pause and delete

Each table row has a checkbox, and the header has a select-all. Ticking anything shows a sticky bar
with the count and three actions: **Pause** (`enabled: false`), **Resume** (`enabled: true`) and
**Delete**. Pause and Resume need no confirmation; Delete does.

- **Button states.** Resume is disabled when no selected check is paused, and it sends only the paused
  ones, because resuming a running check is a server-side no-op that would still be counted as
  resumed. Pause is never disabled by the selection and sends every selected check: pausing a check
  that is already off still records a person's pause (`operator_pause_affirmed`), which stops
  plan-sync from switching back on a check it had disabled itself. The page cannot tell those checks
  apart from ones a person paused.

- **Select-all covers the visible rows only**, meaning the rows the infinite scroll has loaded so
  far. There is deliberately no "select every check matching the filter". The design-system checkbox
  has no indeterminate state, so the header box is ticked only when every visible row is. Clicking it
  otherwise selects them all, and clicking it with all ticked clears them. The bar's count shows a
  partial selection. `records-list` in project-management behaves the same way.
- **The selection lives in the facade.** It is cleared by `#restartPagination()`, so a search, any
  filter, a reload and a completed bulk action all clear it. Loading the next page by scrolling does
  not: those rows are added to the same list, and the header box simply stops reading as "all".
  `selectedRows` intersects the ticked ids with `rows()`, so a row that leaves the list is never
  counted or sent.
- **Chunking.** The API takes at most 100 ids per request. Select-all can pass that once the reader
  has scrolled through more than five pages, so the facade sends chunks of 100 one after another and
  merges the results. A chunk whose request fails reports its ids as `request_failed`. The chunks
  that did apply are still reported, and an error would have hidden them.
- **Partial failures are always shown**, for example "18 paused, 2 could not be paused (they no
  longer exist)". The parenthesis is used only when every failure is `not_found`, the one reason the
  API documents. Any other reason gets the message without it. When nothing applied because every
  request failed, the user sees a plain error toast.
- **Plan-bound checks.** A check with `plan_bound: true` is owned by plan-sync, which recreates it
  on its next run if it is deleted. The bulk delete confirmation counts these and warns about them,
  pointing at Pause instead, because automation never resumes a check a person paused.
- **Retries.** `bulk/delete` opts out of `RetryInterceptor`. A replay after a lost response would
  answer `not_found` for every check the first attempt deleted. `bulk/set-enabled` is idempotent and
  keeps the retries.
- **Read-only mode** renders neither the checkbox column nor the bar.
- The list reloads from page 1 after every bulk action, which also refreshes the summary cards.

## Monitoring settings

Two whitelabel-level switches, owned by `synthetics-service` (`whitelabel_monitoring_configs`):
`enabled` (when off, no check of the whitelabel runs and no alert is sent) and `autoSync` (when off,
the nightly baseline sync skips the whitelabel; "Create baseline checks" still works).

**The gate is the user's own permission.** The "Monitoring settings" button shows only when the user
holds `can_archive_whitelabel`, the permission partners requires for the `PATCH` (checked there against
b2b-iam, together with the whitelabel's organization). synthetics-service is an internal service that
trusts its callers, so it no longer answers `can_edit`. The facade's `canEditMonitoringConfig` combines
that permission with a config that was read. A `403` on the `PATCH` — the user lost the right while the
page was open — is mapped by the service to `MonitoringConfigForbiddenError`; the dialog shows the
permission message and closes, and the store raises `writeRefused` so the button goes away. The button
also sits inside the route's `isReadOnly` gate with the other mutation controls, so a per-whitelabel
viewer never sees it either.

**Per-check toggles are independent of the whitelabel switch.** Pausing the whitelabel does not
touch any check's own `enabled`, and resuming it does not resume a check someone paused by hand.
The list, row toggles and summary keep showing each check's own last known state.

`MonitoringConfigStore` owns the GET/PATCH IO and the held config. The facade loads it on `init()`,
next to the first page and the summary, and re-exposes `monitoringConfig`. A failed read leaves it
`null` and is not surfaced: no banner, no button, and the rest of the page as before, since the
config is secondary to the check list. Each switch sends a `PATCH` with only its own field, and the
store replaces its state with the response body — there is no follow-up `GET`. Overlapping PATCHes
are epoch-guarded so an earlier response cannot overwrite a later one. Turning `enabled` off is the
one change confirmed first, because it silences the whole whitelabel with no expiry. While a `PATCH`
is in flight its switch is disabled; on failure it is put back and a toast says so.

When `enabled` is false a warning banner (`ui/monitoring-paused-banner`) is shown to **every** user.
Editors who can open settings (`canEditMonitoringConfig` and not route read-only) see when and by whom it was paused;
everyone else gets the generic paused copy with no actor email. `autoSync=false` alone shows no banner.

## The open check in the URL (`check_id`)

`?check_id={checkId}` on `/whitelabels/synthetic-checks/{whitelabelId}` names the check the reader is
on, and it works in both directions.

**Inbound**, the param opens that check in the page's own read-only view modal — the same per-type
modal, the same `view` mode and the same `canEdit` gating as clicking the row, so a reader arriving
from an alert sees nothing bespoke.

**Outbound**, opening a check from the table writes it, from both row actions: View and Edit. A
reader who found a check by scrolling can copy a shareable link to it out of the address bar, and a
reload puts them back on it rather than at the top of a 1,151-row list. The invariant is one line: a
check modal is on screen **if and only if** the URL names that check. It is enforced in one place —
`#openCheckModal` writes the param, and the close handler clears it — so `onView`, `onEdit`, the link
itself and the view→edit handoff all inherit it rather than each remembering to do it.

The param carries **no mode**. It says which check the reader is on, never what they are doing with
it: Edit writes the same param, and loading that URL lands in `view`, which is the same safe landing
the view→edit handoff already uses — a half-typed edit form is not something to restore from a URL.
That is also what keeps the frozen contract intact: `synthetics-service` builds the identical URL for
its Slack alerts, and it must go on meaning "open this check, read-only".

Every write uses **`replaceUrl`**, in both directions. A modal is not a page: opening one must not
cost a history entry and neither must closing it, or leaving the list would take one press of Back per
check the reader looked at. So Back leaves the page exactly as it did before this page had a deep
link, and does **not** close the modal; closing it is the modal's own affair, and is also what takes
the param back out. `role-management-container` makes the same choice for its selection state.

The param name is snake_case and **frozen**. `synthetics-service` builds this URL from the same two
ids and puts it in the body of the Slack alert it sends for a failing check, so renaming the key
breaks every alert already sent. It is declared once, as `CHECK_ID_QUERY_PARAM` in
`synthetic-checks-page.component.ts`.

**No route segment was added.** A `:checkId` child route was considered and rejected: every other
detail in this feature is a modal over the list, and a segment would have been a second way to render
the same thing.

Resolution goes through `SyntheticChecksFacade.resolveRow()`, never through the rows already loaded.
The largest production whitelabel has 1,151 checks behind the infinite scroll, so the check being
alerted on is usually not among the ones fetched, and a lookup in the loaded list would silently open
nothing — the exact dead end the deep link exists to remove.

On the **entry** path the two reads always happen, even for a check page 1 is about to return: the
page subscribes to `queryParamMap` in `ngOnInit` and it replays synchronously, while `loadPage(1)`
only starts when the infinite-scroll directive's `[active]` binds during the first change detection,
so the resolve is issued first and the row map is still empty when it looks. The measured request
order on a deep-link load is `getCheck`, `getLatestResult`, `listChecks`. A row already held is
answered from memory at no cost, but that only happens for a link followed while the page is already
open.

Now that the page writes the param itself, most `queryParamMap` emissions are its own echo, naming a
check that is already on screen. Those are dropped before `resolveRow` is reached: re-entering it
would close and reopen the very modal that caused the emission. The request was never the problem — a
row the reader clicked came out of `#rows`, which `resolveRow` short-circuits on before any call — but
a modal that flickers shut and open again is.

The write settles a race as well. Opening a check from the table is a navigation, so it supersedes an
inbound link that is still resolving: `switchMap` abandons the in-flight resolve instead of leaving
the two to finish in either order.

The resolved row is kept **apart from the paginated rows**, in the facade's `#resolvedRows`, not
merged into `#rows`. Merging broke both of `#rows`'s jobs. Page 1 replaces `#rows` wholesale and
lands second, so the merged row was evicted moments after arriving — and with it went `delete()`,
which used to answer a missing row with `of(undefined)`: that _emits_, so the page raised its "Check
deleted." toast having sent no DELETE at all. `#refetchIntervalSeconds` is derived from `#rows` too,
so a merged row silently reprogrammed the 60s auto-refresh for the rest of the session: a paused
deep-linked check stopped it outright (an empty enabled set yields no interval, and `#silentRefresh`
only ever merges, so the row never left), and a 30s one — the profile of a check that alerts —
multiplied the poll tenfold against that 1,151-check whitelabel.

What the resolved row is for is the **mutations reachable from the opened check**: `update()` needs
it to apply the edit locally and move the summary's enabled counts, and `toggle()`/`delete()` need it
to do the same without refetching. Note that the modal itself has no toggle or delete — those are
table row actions (`(toggleClick)`/`(deleteClick)`); the modal only calls `facade.update`. None of
the three refuses to send its request on a missing row any more: a mutation that cannot find its row
still calls the API and reports the truth, because "did nothing, silently" and "said it deleted
something it never asked to delete" are both worse than an error. The resolved row is also
deliberately **not** added to the table: which rows the table shows is the list's answer, not a
link's, and injecting one put it out of the server's sort order and made the same URL render two
different lists depending on which response won the race.

A failed **result** read still degrades to `latestResult: null` rather than erroring — a modal
missing its last run still says what the check is — but "never ran" and "could not be read" are no
longer the same answer. `getLatestResult` maps a `null` body _and_ a `404` to `null`, and propagates
everything else; the facade records those ids in `latestResultUnavailable`.

The view modal reads that set for the check it opened and hands it to `synthetic-check-latest-result`
as `[latestResultUnavailable]`, which renders a danger alert — "Could not load the latest run for this
check. Retry to load it." — where a check that has genuinely never run still gets its `—`. The alert's
retry emits `retryLatestResult`, and the modal answers it by re-subscribing `resolveRow`: the facade
deliberately skips its `#resolvedRows` short-circuit for a flagged check, so that re-subscribe
re-fetches rather than replaying the gap it cached. The notice is gated on `latestResult` still being
`null` as well as on the flag, so a run that arrives by another route — page 1 paginating the check in
with its result embedded — renders as the run it is even while the flag is still set. A retry that
fails again emits a row with `latestResult: null` and the flag still set, so the notice stays up and
can be retried once more; only a failure to read the _check itself_ reaches the error branch, where
the notice also stays.

Only one check modal is allowed on screen, and only one thing owns the param: whichever modal that
is. A newer `check_id` replaces the view modal a previous link opened rather than stacking on it, but
yields to anything the reader is responsible for — a modal they opened themselves, and any edit form,
deep-linked or not, because unsaved input outranks an inbound link. A link that yields hands the param
**back** to the check on screen instead of clearing it, which is the half the outbound write changed:
clearing would leave the reader's own check unnamed in the URL, and their close would then find
nothing of its own to drop. `deepLinked` survives on the on-screen record for exactly this one
decision — it no longer says who owns the param, since every modal now does, only what a newer link
may replace.

Closing a check modal clears `check_id`, whichever way it was opened. The clear is guarded on the
snapshot value, so a check that arrived after this one — a second link, or another check the reader
opened — does not have the param taken out from under it. A failure clears it too, so a reload does
not re-error: the data layer raises `SyntheticCheckNotFoundError`
(`models/synthetic-check.model.ts`) with reason `unknown`
(the `404` — unknown, deleted, or another whitelabel's check, which hard deletes make one answer by
design) or `malformed` (the `422`), and the page picks `toast.deepLinkNotFound`,
`toast.deepLinkInvalid` or, for any other failure, `toast.deepLinkError`. No status or body is read
outside the service — the `404` and the `422` do not even answer in the same envelope.

## i18n

Only `en.json` is edited by hand, and that is the whole job — the other 17 locales are not this
page's concern and must not be hand-mirrored. `.github/workflows/phrase_pull.yml` runs daily: it
`phrase push`es the new `en.json` keys to Phrase and `phrase pull`s the translated locales back as a
PR. Nothing enforces key parity between locale files (`check-translation-files.bash`, the only
i18n check and a `.husky/pre-commit` step, just `JSON.parse`s each file), and the files are far from
parity anyway — `en.json` carries ~20k keys against ~13k in `fr`/`es` and 232 in `th`.

One consequence: the keys this feature replaced (`header.autoGenerate`,
`header.backendNotAvailableTooltip`) are gone from `en.json` but still sit translated in 14 locale
files. They are unreachable, harmless, and Phrase — not a hand edit — is what removes them.

## Known gaps (TODOs)

- **No re-attach to an in-flight sync** — `startBaselineSync()` is the only way to observe a sync, and it observes only the one it started. Navigate away and back (or reload) while a sync is running and the fresh facade knows nothing about it: `baselineSyncing` is `false`, the button is enabled, and pressing it is answered **409** — the user is told a sync is already running but can never watch it finish or see its result. Fixing it needs a backend endpoint that does not exist yet (`GET /baseline/current`, or a `?status=running` filter on a list endpoint); the facade would resolve it on `init()` and resume polling. Until then the user's only recourse is to re-run the sync once the other one is done.

- **Per-check uptime %** — API only returns whitelabel-level uptime; rendered as `—` placeholder.
- **"Last run" stat** — comes from `/summary`'s `last_run_at`. It is not aggregated client-side, and the N+1 walk over `results/latest` this bullet used to describe was never written: until PARTNERS-10806 nothing in this page called that endpoint at all, because the list response embeds a `latest_result` per row (`mapSyntheticCheckRow`).
- **`GET /{checkId}` never carries a result** — its `latest_result` is unconditionally `null`, not "null when the check has never run". In `synthetics-service`, `GetCheckQueryHandler` takes only a check repository and returns `SyntheticCheckDto.from_entity(check)`, whose `latest_result` field defaults to `None`; only `FindPaginatedChecksByWhitelabelQueryHandler` injects the result repository and batch-loads `find_latest_by_checks` for the page. That is why deep-link resolution issues a second call to `/{checkId}/results/latest` instead of trusting the check payload. Optimising that call away silently blanks the failure detail for the on-call reader the link was built for — fix it backend-side first.
- **Host catalog/filter** — not in API; UI element omitted.
- **View / edit check** — reuses the per-type create modals (`mode: 'view' | 'edit'`) with a read-only form in view and pre-populated fields in edit; latest result is shown below the form in view mode only.
- **Assertion type/operator enums** — modelled as `string`; narrow to literal unions when backend enums are confirmed.
- **AssertionResult shape** — best-guess; confirm with backend once endpoint is stable.
