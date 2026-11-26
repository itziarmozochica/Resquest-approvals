# Prototype changes and known gaps

## Differences from FeverZone

| Area | FeverZone | This prototype |
| --- | --- | --- |
| Authentication | Real login, MFA, SSO | None. `/login`, `/mfa/*` and unknown routes redirect to `/project-management/projects`; session seeded in `localStorage` |
| Default landing | Landing target per partner (often Analytics / plans) | `/project-management/projects`; `AuthenticationService.defaultRedirectUrl` and `LoggedOutGuard` point there |
| Routes | Many lazy routes | Only `project-management/**`, `admin/project-management/settings`, `logout` (`private-routes.ts`) |
| Menu | Full sidebar | Events, Requests & Approval, Settings. "Log out" removed. Sections removed from `sidebar.component.html`; their flags remain in the `.ts` |
| Language | Browser / user language | Always English (`i18n.initializer.ts`, `date.util.ts`, `iso-date.pipe.ts`) |
| Backend | Real APIs | In-browser mocks ([04](04-api-and-mocks.md)) |
| Feature flags / permissions | Per partner | All on / all granted |
| Secrets | Google OAuth client id in environment files | Replaced by `GOOGLE_CLIENT_ID_PLACEHOLDER` (the repo's secret scanner blocked pushes) |

## How the copy was made

Exported from `feverzoneclient` at `30bdc55af1`, router cut down to Requests & Approval, then every `.ts` file not reachable from the entry points
(plus the few NgModules whose components stay referenced) was deleted; templates and styles of surviving folders were kept. Roughly 29,500 tracked files became ~9,500.
A few unrelated modules (`box-office`, `plan`, `kiosk`, `validation`, `attendees` seating map) remain because the shell imports them eagerly.

## Known gaps

- **Events and Settings entries do nothing.** They are in the menu but have no routes or mocks yet. Only Requests & Approval and the admin settings page are routed.
- **Summary counters show 0** on the projects list even though requests/approvals exist. Cause not investigated.
- **AI assistant** button in the header and the side panel are still rendered (not requested to remove).
- **Mock gaps:** see "Not mocked yet" in [04](04-api-and-mocks.md). Create/approve/reject actions do not persist.
- **Language of seeded content** is English; user-entered content is not localised.
- **Dependencies:** Angular 20.3 while upstream is on Angular 21. GitHub reports ~87 dependency vulnerabilities inherited from the copy.
- **Dormant code** listed in [../AGENTS.md](../AGENTS.md).

## Staying in sync with the source

This copy does not follow the codebase it came from, and the helper that compared the two was left out because it needs access to that private repository. Port upstream changes by hand when they matter, and note the source commit you aligned to.
