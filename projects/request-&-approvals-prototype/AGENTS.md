# AGENTS.md — Requests & Approval prototype

Read this first. It tells you what this repo is, what is deliberately different from FeverZone, and where the knowledge lives.

## What this is

A standalone, **login-free, mock-data** copy of the **Requests & Approval** area of FeverZone (Fever's B2B partner portal),
meant for designers and engineers to iterate on its design and flow, and to be previewed on Vercel by people with no FeverZone access.

- Origin: a Fever Zone codebase (Angular 20.3). It is not synced with its source: changes here do not flow back.
- Stack: Angular 20 (NgModules + standalone mix), TypeScript, SCSS, Ignite design system (`projects/ignite`), ngx-translate.

## Rules for this repo

1. **The UI is always English.** Do not add language switching. The i18n initializer is pinned to `en`.
2. **No login.** `/login` and unknown routes redirect to `/project-management/projects`. The session is seeded in `src/mock/install-mock-api.ts`.
3. **No real network.** Every API call is answered in the browser by `src/mock`. Never point this app at real FeverZone APIs and never add real partner data, tokens or keys.
4. **Menu = Events, Requests & Approval, Settings only.** Other sections were removed from `src/app/shared/layout/sidebar/sidebar.component.html` on purpose. Only Requests & Approval (and the admin settings page) is routed today.
5. **Do not commit or push without the project owner asking.** The repository is public: never add real keys, hosts, tokens or partner data.
6. Prefer extending the mocks over touching feature code when you only need different data.

## Where things are

| You want to… | Go to |
| --- | --- |
| Understand the product and flows | [docs/01-product-overview.md](docs/01-product-overview.md) |
| See routes, screens, guards | [docs/02-screens-and-routes.md](docs/02-screens-and-routes.md) |
| Know statuses, types, DTO shapes | [docs/03-domain-model.md](docs/03-domain-model.md) |
| Change mock data or add an endpoint | [docs/04-api-and-mocks.md](docs/04-api-and-mocks.md) |
| Know what differs from FeverZone and what is broken | [docs/05-prototype-changes-and-gaps.md](docs/05-prototype-changes-and-gaps.md) |
| Run it, restyle it, deploy it | [docs/06-iterating-and-deploying.md](docs/06-iterating-and-deploying.md) |

## Code map

| Path | What |
| --- | --- |
| `src/app/modules/project-management/` | Projects list, project detail, records list, create-record modal |
| `src/app/modules/ir-approval/` | Information Requests and Approvals (new, detail, evaluation, comments, uploads) |
| `src/app/modules/admin-project-management-settings/` | Admin settings: templates, stepper catalog, field editors |
| `src/app/shared/routes/private-routes.ts` | The only routes exposed (rewritten for the prototype) |
| `src/app/shared/layout/` | App shell: header, sidebar (trimmed) |
| `src/mock/` | In-browser mock API: `data.ts`, `routes.ts`, `optimizely.ts`, `install-mock-api.ts` |
| `projects/ignite/` | Ignite design system and theme tokens |
| `src/assets/i18n/en.json` | English copy (key namespaces `projectManagement`, `informationRequests`, `approvals`, `adminProjectManagement`) |

## Dormant code

`box-office`, `plan`, `kiosk`, `validation` and a few other modules are still in the tree because the app shell imports them eagerly.
They are not reachable from the UI. Do not build on them; remove them only together with the shell imports that pull them in.
