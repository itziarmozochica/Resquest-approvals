# Iterating and deploying

## Run locally

Requires access to Fever's GitHub Packages and the FontAwesome Pro registry (tokens in `GITHUB_TOKEN` and `FONTAWESOME_TOKEN`).

```bash
cp .npmrc.example .npmrc        # .npmrc is git-ignored; never commit tokens
corepack enable && pnpm install
pnpm exec ng serve --configuration localStaging --port 6300
```

Open `http://localhost:6300/project-management/projects`. No login. The `localStaging` configuration only selects the environment file; the mock layer answers every API call.
Check the build with `pnpm exec ng build --configuration development`.

## Iterating on the design

1. Pick the screen in [02](02-screens-and-routes.md); templates are `*.component.html` next to each component, styles are `*.component.scss`.
2. Reuse Ignite (`ignt-*`) before writing new CSS; tokens are in `projects/ignite/theme`.
3. Need different data or states? Edit `src/mock/data.ts` ([04](04-api-and-mocks.md)).
4. Copy lives in `src/assets/i18n/en.json` under `projectManagement`, `informationRequests`, `approvals`, `adminProjectManagement`.

## Deploying to Vercel

One Vercel project serves both projects, as plain static files (no build on Vercel, so no private tokens there):

- `/` is the prototype.
- `/handoff/` is the handoff docs; its "Open prototype" button goes to `/` on the same site.

```bash
scripts/publish-vercel-static.sh
```

This builds the prototype (`scripts/deploy-vercel-static.sh`, which also copies the docs into `handoff/` and keeps only the English translations), then force-pushes the result to the `vercel-static` branch of `origin`.
That branch holds only the built site, so build output never piles up in the history of `main`. In Vercel, import this repository and set:

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Production Branch | `vercel-static` |
| Build Command | empty (override on) |
| Install Command | empty (override on) |
| Output Directory | `.` |

Run the publish script again after every change you want online. Vercel redeploys on each push to `vercel-static`.
To try the same site locally, serve `dist/vercel-static` with any static server that falls back to `index.html` (all paths except `/handoff/` and `/assets/`).

Notes:
- The build needs the private registries once (see "Run locally"). Vercel itself does not.
- A new Vercel project may be reachable by anyone with the URL. The prototype contains only mock data, but check *Deployment Protection* if you want it restricted.
- To build on Vercel instead, the Vercel project would need the two registry tokens as environment variables.
