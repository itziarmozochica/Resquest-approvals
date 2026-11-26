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

The prototype is a static single-page app once built, so the simplest deploy needs **no private tokens on Vercel**: build locally and upload the result.

```bash
scripts/deploy-vercel-static.sh              # builds and prepares dist/vercel-static
cd dist/vercel-static && npx vercel --prod
```

`vercel login` opens the browser; the first run asks to create the project (accept the defaults; output directory `.`).
Re-run both commands after each change.

Notes:
- The build needs the private registries once (see "Run locally"). Vercel itself does not.
- A new Vercel project may be reachable by anyone with the URL. The prototype contains only mock data, but check *Deployment Protection* if you want it restricted.
- Auto-deploy on push through GitHub would need the Vercel GitHub app on this repository plus the two registry tokens as environment variables. The root `vercel.json` here is for that case only.
