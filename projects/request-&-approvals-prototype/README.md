# Requests & Approval prototype

> Lives in `itziarmozochica/Resquest-approvals`, under `projects/request-&-approvals-prototype/`, next to its handoff docs (`projects/r&a-handoff-doc/`).
> Derived from a Fever Zone codebase (Angular 20.3). Environment-specific values were replaced with placeholders; the app runs on mock data.


Standalone copy of the **Requests & Approval** area of FeverZone, to iterate on its design and flow.

- Source: `feverzoneclient`, base commit `30bdc55af1` (Angular 20.3).
- Entry point: `/project-management/projects` (the sidebar entry "Requests & Approval").
- Reachable routes (see `src/app/shared/routes/private-routes.ts`): `project-management/**` (projects list, records list, Information Requests, Approvals) and `admin/project-management/settings`.
- Everything else was removed from the router. Modules that the shell still imports eagerly (box office, plan, kiosk, validation…) are kept only as dormant dependencies so the app compiles; they are not reachable from the UI.

## Run

```bash
cp .npmrc.example .npmrc   # needs GITHUB_TOKEN and FONTAWESOME_TOKEN for the Fever / FontAwesome registries
corepack enable && pnpm install
pnpm exec ng serve --configuration localStaging --port 6300
```

Open `http://localhost:6300/project-management/projects?ofeat=project_management_fz`
(the `ofeat` query param turns on the `project_management_fz` feature flag locally).

## Status

- Builds clean with `ng build --configuration development`.
- Still talks to the staging API, so you need a staging login. Mock auth / permissions / data for a login-free Vercel deploy is the next step.
