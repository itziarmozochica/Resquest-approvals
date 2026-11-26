# Insights embed — glossary

The vocabulary of the connection between Feverzone and the **Insights Portal**
(`(internal repository)`), which is the official replacement for Metabase in partner
reporting.

This file is a glossary and nothing else: no decisions, no implementation detail. Decisions live in the
spec that introduced them (`plans/PRD/PRD-4516_real-time-tab-in-360-analytics.md`) and in the code.

## Terms

**Embed family** — one of the two contracts the portal publishes: `real-time` or `modular` (also called
`declarative`). A family defines the portal route, the catalog endpoint, the selection cookie, the
direction of the messaging and whether it accepts a theme. It is **not** a view or a screen.
**Feverzone implements `real-time` only**: the `modular` embed was started and never finished, and
PRD-4859 removed it. The portal still publishes `/modular-dashboards/`, so a route with no counterpart
here is expected, not missing code.

**Surface** — a Feverzone screen that hosts an embed. Today: `real-time/big-launches`,
`real-time/attendance`, 360's Real Time **tabs** — one per real-time dashboard 360 chooses to host,
which is a subset of the ones the portal publishes — and the Reporting Dashboard's native tabs
(`/reporting/dashboard`).
**Two surfaces can share a family**, and when they do they share its selection cookie, which is global
browser state — not per-tab state, and not per-dashboard: the cookie carries no slug.

**Domain selection** — what the user picks in a filter bar: cities, places, plans, statuses and
currency.

**Embed selection** — the subset the portal consumes: `{ partnerId, planIds, currency }`. It is derived
from the domain selection; it is never edited on its own.

**Persisted selection** — the selection the URL and `localStorage` hold. It is **always the user's**,
never narrowed by whatever is on screen.

**Rendered selection** — the selection the active surface imposes on what is painted. It may be a subset
of the persisted one. _The two diverging is correct by design, not a bug._

**Single-plan mode** — the mode a surface imposes on a shared filter bar when it can only honour one
plan: a single plan, and while it lasts, **the place becomes authoritative** over the plan. Since
PRD-4640 its only trigger is the set of Metabase dashboards that bind `id_plan` as a template
variable; the Real Time tab no longer uses it.

**Plan limit** — how many plans a surface can forward to the embed. Three ceilings apply and the
smallest wins: what the Insights API accepts per dashboard, what fits in the selection cookie, and
what we have decided to open. A limit **caps what is sent**; it never removes a plan the user picked.

**Truncated selection** — the selection minus what the plan limit leaves out. Unlike single-plan
mode, nothing on screen changes, so a surface that truncates has to say so.

**Which plans a truncated selection keeps is not part of any contract.** The limit cuts wherever the
filter bar's own order happens to put the boundary, and that order is the backend catalogue's — not
the order the user picked, not a date, not relevance. So the sentence a surface shows must not name or
imply a criterion.

## Related

- The host side of the contract: `infra/feverzone-client-data.md` in the Fever KB.
- The portal side: `infra/insights-portal-client.md`, plus `docs/embedded-integration.md` in that repo
  (out of date on the `theme` param and on the token encoding — see the spec's §4.5).
