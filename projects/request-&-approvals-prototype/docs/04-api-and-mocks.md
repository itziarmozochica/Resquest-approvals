# API and mocks

No request leaves the browser. `src/mock/install-mock-api.ts` is called first thing in `src/bootstrap.ts` and patches `XMLHttpRequest` and `fetch`.
For each request it matches `pathname + search` against `src/mock/routes.ts`:

1. A matching route answers with `{ status, body }` after ~10 ms.
2. No match and the path looks like an API (`/api…/`, `/apigw/`, `/agents/`, `/efr/`, `/<n>.<n>/`) → **404** and a console warning `[mock-api] not implemented: METHOD path`.
3. Anything else (app assets, fonts, i18n JSON) passes through to the network.

Look for those warnings in the browser console to find endpoints you still need.

## Files

| File | Purpose |
| --- | --- |
| `src/mock/data.ts` | All seed data: 3 projects, 4 information requests, 4 approvals, 2 item comments. Dates are relative to "now" |
| `src/mock/routes.ts` | Route table (regex, optional method, handler) |
| `src/mock/optimizely.ts` | Builds an Optimizely datafile with **every** flag in `FeatureFlags` ON |
| `src/mock/install-mock-api.ts` | XHR/fetch patch and session seed (`token`, `userId` in `localStorage`) |

The partner id is a wildcard (`\d+`) in every route: any partner id the app picks gets the same data.

## Endpoints currently mocked

| Method + path (suffix) | Returns |
| --- | --- |
| `GET …/datafiles/<key>.json` | Optimizely datafile, all flags on |
| `POST …/api-iam/1.0/login`, `…/sso/login`, `…/users/<id>/logout` | Fake token / ok |
| `GET …/api-iam/1.0/users/me` | Mock superuser, language `en_US` |
| `GET …/api-iam/1.0/organizations/<id>/permissions` | Every value of the `Permissions` enum |
| `GET …/api-iam/1.0/users/<id>/organizations`, `…/roles` | One organisation "Fever Demo Partner" |
| `GET …/api/b2b/partners/<id>/` | Partner object |
| `GET …/3.0/settings/partners/<id>/projects/` (and `…/<projectId>/`) | Projects |
| `GET …/3.0/partners/<id>/projects/<pid>/approvals/` and flat `…/approvals/` | Approvals (filtered by project when scoped) |
| `GET …/approvals/<id>/` | One approval |
| `GET/POST …/approvals/<id>/items/<itemId>/comments/` | Item comments (POST echoes a new comment, nothing is stored) |
| `GET …/information-requests/` (scoped and flat) and `…/<id>/` | Information requests |
| `POST …/approvals/`, `POST …/information-requests/` | Echo of the body with a generated id (not persisted) |
| announcements, distributor publications, terminology settings, notifications, zendesk token, chatbot prompts, outages, plans | Empty lists |

## Not mocked yet (will 404)

Templates (`…/information-request-templates`), stepper templates and service-catalog settings (admin page), Ziflow folders and review URLs, Drive link imports and file URLs, sheet preview, venue pricing, alert config, PM directory, answers/submit/review actions (`PATCH/POST/PUT` on an IR or approval). Screens that depend on them render empty or show an error toast.
The exact URLs are the private `#…Url()` builders in each `*.service.ts` under `src/app/modules/**/services`.

## Adding or changing data

- **Another project/request/approval:** add an object to the matching array in `src/mock/data.ts`. Keep `launch_id` equal to a project `id` to attach it.
- **A new status or type:** use the enum values in [03](03-domain-model.md).
- **A new endpoint:** add `{ method?, test: /regex/, handler: (req, match) => ok(data) }` to `mockRoutes`. Response envelope is `{ data, error: null }` (`ok(...)` helper). Order matters: first match wins, so put specific routes before generic ones.
- **A restricted user:** edit the permissions handler; **flags off:** pass a shorter list to `buildDatafile`.
- **Mutations:** handlers are stateless. If you need "create then see it in the list", keep an in-memory array in `data.ts` and push to it from the POST handler.

## Origin of the shapes

DTO shapes follow the app's own `*-api.model.ts` files. Earlier seed data was adapted from FeverZone's e2e fixtures
(`projects/fz-original/playwright/{launches,approvals,information-requests}/mocks`, **not** copied into this repo); where the two disagreed the app's models won (for example approval `upload_method` is `computer`/`link`, not `DRIVE_LINK`/`FILE_UPLOAD`).
