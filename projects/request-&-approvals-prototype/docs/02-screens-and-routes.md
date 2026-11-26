# Screens and routes

Routes are declared in `src/app/shared/routes/private-routes.ts` (prototype shell) and in the feature routing modules.
`''` redirects to `project-management/projects`; `/launches` is a legacy alias.

## Project management (`project-management-routing.module.ts`)

| URL | Component | Notes |
| --- | --- | --- |
| `/project-management/projects` | `ProjectsListComponent` | Header, "Add member" link, "+ New Information Request" / "+ New Approval" buttons, 4 summary cards, search box, project cards |
| `/project-management/projects/:projectId` | `RecordsListComponent` | Records of one project; route data `defaultTypes: ['request','approval']`, `defaultStatus: 'pending'` |

## Information requests and approvals (`ir-approval-routing.module.ts`)

Each pair exists **scoped to a project** (`/project-management/projects/:projectId/…`) and **flat** (`/project-management/…`). Guard: `PermissionBasedGuard` with the permissions and flag in [01](01-product-overview.md).

| URL (flat form) | Component | Extra guard |
| --- | --- | --- |
| `/project-management/information-requests` | `RecordsListComponent` (`defaultTypes: ['request']`, status pending) | — |
| `/project-management/information-requests/new` | `InformationRequestNewComponent` | create permission |
| `/project-management/information-requests/:requestId` | `InformationRequestDetailComponent` | `unsavedChangesGuard` on leave |
| `/project-management/information-requests/:requestId/evaluate` | `InformationRequestEvaluationComponent` | admin permission |
| `/project-management/approvals` | `RecordsListComponent` (`defaultTypes: ['approval']`, status pending) | — |
| `/project-management/approvals/new` | `ApprovalNewComponent` | create permission, `unsavedChangesGuard` |
| `/project-management/approvals/:approvalId` | `ApprovalDetailComponent` | `unsavedChangesGuard` |

## Admin settings

| URL | Component |
| --- | --- |
| `/admin/project-management/settings` | `AdminProjectManagementSettingsComponent` (template list, template editor, stepper catalog/editor, field cards, layout editor, picklist/grid editors, create-field and create-template dialogs) |

## Component families (what to look at when restyling)

| Folder | Contents |
| --- | --- |
| `project-management/components/` | `launch-record-row`, `launch-records-card`, `create-record-modal`, `project-migration-banner` ("New home for launches" banner), `project-sf-summary` |
| `ir-approval/shared/components/` | `fz-wizard-stepper`, `fz-upload`, `file-preview-dialog`, `file-thumbnail`, `drive-folder-button`, `drive-sync-badge`, `sheet-preview-table`, `edit-history-view`, `alert-config-form`, dialogs |
| `ir-approval/information-requests/components/` | One component per question type (`information-request-question`, `ir-file-upload`, `ir-venue-answer`, `ir-table-repeater-answer`, `ir-product-catalog-editor`, `ir-named-date-ranges-editor`, `ir-schedule-*`, …) |
| `ir-approval/approvals/components/` | `approval-item-review`, `approval-item-comments`, `approval-add-items`, `approval-spreadsheet`, `approval-drive-file-tree`, `approval-reject-reason-dialog`, `approval-resend-dialog`, `approval-review-progress`, `approval-ziflow-folder-picker`, `subtype-payload-editor` |

## Design-system usage

Most-used Ignite pieces in these modules (count of occurrences in templates): `ignt-button` (106), `ignt-wrapper-card` (28), `ignt-tag` (18), `ignt-input-field` (15), `ignt-table-column` (11), `ignt-checkbox` (10), `ignt-tabs-item` (9), `ignt-pill-button` (7).
Shared styles live next to the code: `ir-approval/shared/styles/_cancelled-tag.scss`, `ir-approval/approvals/styles/_approve-button.scss`; theme tokens in `projects/ignite/theme`.
