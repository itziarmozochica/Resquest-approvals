import type { Type } from '@angular/core';

/**
 * Stable identifier for a one-time announcement (e.g. `reservations-splash`).
 *
 * The same key is used across every layer: the backend targeting config, the
 * per-partner-admin seen store, the client registration, and instrumentation —
 * so a consumer registers content against the key the backend targets.
 */
export type AnnouncementKey = string;

/**
 * A single announcement returned by `GET /announcements` for the authenticated
 * partner-admin. The server has already applied targeting **and** filtered out
 * announcements the admin has already seen, so every descriptor here is
 * "targeted AND unseen". Display content is code-registered (see
 * {@link AnnouncementRegistration}); the backend carries no content.
 */
export interface AnnouncementDescriptor {
  readonly key: AnnouncementKey;
}

/**
 * Host-declared mapping of an announcement key to the component rendered when
 * that announcement is shown. Passed to `provideOneTimeAnnouncements`.
 *
 * The component is opened in a dialog; it is responsible only for its own
 * content and dismissal — targeting and "seen" persistence live in the library.
 */
export interface AnnouncementRegistration {
  readonly component: Type<unknown>;
  readonly key: AnnouncementKey;
}

/**
 * Partner-admin context supplied by the host once login/partner selection is
 * complete. Emitting a value means "a partner-admin is ready **and** eligible"
 * to be shown announcements; the host encapsulates the coarse client-side
 * exclusions that must stay in place (my-business / kiosk / non-partner) by
 * emitting `null` for those contexts (see `AnnouncementsContextPort`).
 *
 * The ids are used for instrumentation and localStorage backfill; the API
 * endpoints themselves are auth-scoped to the current user.
 */
export interface AnnouncementContext {
  readonly userId: number;
  readonly partnerId: number;
}
