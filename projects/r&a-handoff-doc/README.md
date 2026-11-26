# r&a-handoff-doc

Handoff docs of the **Requests & Approval** prototype (`../request-&-approvals-prototype`), in the same shell as the Calendar handoff (`../gc-calendar-handoff-docs`).
Four pages, most still empty: **Home**, **Gap review**, **Impact**, **Versions**.

| Page | File | State |
| --- | --- | --- |
| Home | `index.html` | Title, link to the prototype and What's new (read from `versions.html`). The screen map is a placeholder until the prototype is captured |
| Gap review | `gap.html` | Empty: no features to review yet |
| Impact | `impact.html` | Empty skeleton (question, numbers, next reads). No login, no data |
| Versions | `versions.html` | Release 1 |

## Run it

The handoff and the prototype run on their own ports; "Open prototype" (top right of every page) goes to the prototype on `localhost:6400`.

```bash
# this handoff, static, no build
cd "projects/r&a-handoff-doc" && python3 -m http.server 6500     # http://localhost:6500/

# the prototype (its own folder, see its README)
cd "projects/request-&-approvals-prototype" && pnpm exec ng serve --configuration localStaging --port 6400
```

Off localhost the button goes to the prototype's folder on GitHub. When the docs are deployed together with the prototype (docs under `/handoff/`), it goes to `../`, the prototype on the same site.

## How it works

- `docs.js` is the shared shell (top bar, menu, search, section tabs, footer). The single list of pages and their sections is `PAGES` near the top; every `<section class="panel" id="…">` of a page must be listed there, and the other way round.
- `docs.css` is the style. `fever-zone-logo.js` and `Assets/*logo*` come from the Calendar handoff: do not edit them.
- To add a release, add a `<section class="panel" id="r2">` above `r1` in `versions.html`, add `['r2', 'Release 2']` first in the `versions` entry of `PAGES`, and run `node --check docs.js`. The Home's What's new follows the first release by itself.
- To add a page: copy `gap.html`, change its `data-page`, add the page to `PAGES` and to `MENU_GROUPS`.

## Differences from the Calendar handoff

- Impact has no login and no server code (`middleware.js`, `api/` and the Impact report were not copied).
- No hand-off (Jira) buttons yet: there are no features. `JIRA` in `docs.js` has the key `OPX` as a guess and no project id **(unverified)**: set both before adding features.
- No captures (`Assets/shots`) and no live prototype frames yet.
- Everything is written in English.

## Deploy

Deployed together with the prototype at `/handoff/` (see the prototype's `docs/06-iterating-and-deploying.md`). On its own, any static host works (`vercel.json` only sets `noindex` on Gap review and Impact).
