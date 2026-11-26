# Domain model

Values below come from the enums and DTOs in `src/app/modules/**/models`. API payloads are snake_case; the mappers (`*.mapper.ts`, `*.adapter.ts`) turn them into camelCase view models.

## Statuses and types

| Concept | Values | File |
| --- | --- | --- |
| Project status | `UPCOMING`, `SALES_LAUNCH`, `ACTIVE`, `FINISHED` | `project-management/models/project-status.enum.ts` |
| Information request status | `PENDING`, `SUBMITTED`, `COMPLETED`, `IN_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `REJECTED`, `CANCELLED` | `ir-approval/information-requests/models/information-request-status.enum.ts` |
| Information request type | `CONTENT`, `ASSETS`, `LOGISTICS`, `LEGAL`, `OTHER` | `…/information-request-type.enum.ts` |
| Approval status | `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED` | `ir-approval/approvals/models/approval-status.enum.ts` |
| Approval upload method | `computer`, `link` (anything else falls back to `computer`) | `…/approval-upload-method.enum.ts`, `approval.mapper.ts` |
| Records list filter | `all`, `pending`, `completed`, `cancelled` (`RecordStatusMode`) | `project-management/models` |
| IR question types | `TEXT`, `TEXTAREA`, `RICH_TEXT`, `NUMBER`, `PERCENTAGE`, `DATE`, `TIME`, `DATETIME`, `EMAIL`, `NAME`, `PHONE`, `WEBSITE`, `PICKLIST`, `DROPDOWN`, `MULTIPICKLIST`, `FILE`, `MULTIFILE`, `TICKET_TYPES`, `CATALOG_GRID`, `FAQ`, `VENUE`, `STEPPER_REF` | `…/information-request-question.model.ts` |
| IR file kinds | `PHOTO`, `VIDEO`, `DOC`, `ANY` | same file |

## Project (launch) DTO

`id`, `partner_id`, `salesforce_launch_id`, `launch_id_c`, `name`, `event_date`, `venue`, `city`, `country_code`, `pm_email`, `bd_email`, `sales_launch_date`, `open_gates_date`, `closed_gates_date`, `lifecycle_status`, `created_at`, `updated_at`.
The projects list only shows projects whose `closed_gates_date` is in the future (comment in the e2e fixtures) — keep seeded dates relative to now.

## Information request DTO

`id`, `launch_id`, `partner_id`, `type`, `title`, `description`, `status`, `attachments[]` (`id`, `file_name`, `file_size`, `drive_file_id?`, `drive_url?`, `uploaded_at`), `timeline[]` (`id`, `status`, `author_email`, `comment?`, `occurred_at`), `created_by`, `created_at`, `updated_at`.
Quick-setup fields (all optional): `template_key`, `quick_setup_enabled`, `quick_setup_used`, `advanced_setup_used`, `can_create_main_plan`, `can_resume_quick_setup`, `main_plan_id`. `template_key === 'event_main_plan'` marks the main-event request that can launch the quick-setup wizard (which lives in the dormant `plan` module).

## Approval DTO (`approval-api.model.ts`)

Required: `id`, `partner_id`, `status`, `upload_method`, `assets[]`, `rows[]`, `timeline[]`, `created_by`, `created_at`, `updated_at`.
Optional and design-relevant: `launch_id` / `project_id`, `title`, `approval_type`, `description`, `due_date`, `drive_url`, `drive_folder_id/url`, `payload`, `available_actions[]`, `own_can_review`, `pending_required_item_ids[]`, `review_progress_by_item`, `edit_history[]`, `alert_config`, `item_comments` (`enabled`, `can_post`, `counts{itemId:n}`, `mentionable[]`).

## Approval item comments

`comments[]` of `{ id, item_id, kind, body, author_email, author_name, created_at, edited_at?, mentioned_emails[] }`. Comment kinds are in `ApprovalItemCommentKind`.

## Statuses that need design attention

Every status above needs a tag style. Statuses not yet represented in the mock data: `DRAFT`, `CHANGES_REQUESTED`, `COMPLETED`, `CANCELLED` (approvals) and `SUBMITTED`, `COMPLETED`, `CHANGES_REQUESTED`, `CANCELLED` (information requests). Add rows to `src/mock/data.ts` to see them.
