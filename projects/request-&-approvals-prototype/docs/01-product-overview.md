# Product overview

**Requests & Approval** is the sidebar entry (section id `project-management`, route `/project-management/projects`) where a partner and Fever's project managers
exchange the information and sign-offs needed to launch an event.

## Concepts

| Concept | Meaning in the UI | Code |
| --- | --- | --- |
| **Project** (a.k.a. launch) | One event being launched. Cards on the projects list show name, city, sales launch and doors-close dates, and pending counts. Backend calls it *project*; older routes and fixtures say *launch*. | `modules/project-management` |
| **Information Request (IR)** | A questionnaire Fever asks the partner to fill in (copy, assets, logistics, legal…). Has a type, a status, optional attachments and a timeline. Built from a template made of typed questions. | `modules/ir-approval/information-requests` |
| **Approval** | Something the partner submits for Fever to review: a spreadsheet link or uploaded files. Reviewers approve, reject (with reason) or request changes, and can comment per item. | `modules/ir-approval/approvals` |
| **Admin settings** | Where admins define IR templates, stepper templates and field layouts. | `modules/admin-project-management-settings` |

## Who sees what

Access is permission-based (enum `Permissions` in `src/app/shared/services/user/permissions.ts`) and gated by the Optimizely flag `project_management_fz`.
In the prototype the mock user is a superuser with every permission and every flag on, so all screens are reachable.

| Permission | Effect |
| --- | --- |
| `can_submit_hub_project_management_information_request` / `…_approval` | See and submit |
| `can_create_hub_project_management_information_request` / `…_approval` | Create new IR / approval (the "+ New …" buttons) |
| `can_admin_hub_project_management_information_request` | Evaluate IRs (`/:requestId/evaluate`); with the approval admin permission below, opens the admin settings page in FeverZone |
| `can_admin_hub_project_management_approval` | Approval administration; admin settings page in FeverZone required one of the two admin permissions |
| `can_admin_project_management_settings`, `can_admin_launches` | Exist in the enum; their exact effect was not traced **(unverified)** |

To design for a restricted user, remove entries from the permission list returned by `src/mock/routes.ts` (route `…/organizations/:id/permissions`).

## Typical journeys

1. **Partner**: opens Project Management → sees summary cards (pending requests, pending evaluation requests, pending approvals, pending evaluation approvals) → opens a project → fills an IR or submits an approval.
2. **Project manager**: creates an IR/approval from the "+ New …" buttons, evaluates submissions, comments on approval items, approves or rejects.
3. **Admin**: edits templates and steppers in settings.
