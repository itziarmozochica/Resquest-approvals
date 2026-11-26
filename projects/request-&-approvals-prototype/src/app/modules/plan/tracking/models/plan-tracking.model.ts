export type CreateEventFlow = 'advanced' | 'quick';

export type PlanCreationFlow = CreateEventFlow | 'duplicate';

export const duplicatePlanFlow = 'duplicate' as const satisfies Extract<PlanCreationFlow, 'duplicate'>;

export type DuplicatePlanSource = 'create_event' | 'plan_card' | 'plan_request';

export type PlanCreationStep = 'setup' | 'content' | 'settings';

export type PlanSetupCardKey = 'content' | 'settings' | 'inventory';

export type CreateEventEntryPoint = 'header' | 'events_list' | 'project_management';

export interface QuickSetupTrackingContext {
  information_request_id?: string;
  /**
   * True when the wizard was opened on an existing plan. Nothing else in the payloads separates a fresh run from
   * a resumed one, and every quick-setup event extends this context, so the whole funnel — step saves, exits and
   * completion — carries the distinction from a single edit site.
   *
   * Named in snake_case on purpose, against the camelCase payload rule in `projects/fz-tracking/AGENTS.md`
   * (Conventions #6): every other key in this context and in the quick-setup events that extend it is already
   * snake_case, and their `planMixpanelMappers` entries all use `properties: null`, so this interface *is* the
   * wire contract. A lone `isResume` would make the interface neither convention and force a rename transform
   * onto every one of those entries just to restore one key. Renaming is only worth doing as a migration of the
   * whole event family, which is out of scope here.
   */
  is_resume: boolean;
  source: CreateEventEntryPoint;
}

export type PlanSaveContext = 'plan_creation' | 'standalone';

export type PlanReviewBackVariant = 'submitted' | 'ready';

export type PlanCreationAbandonStep = 'content' | 'schedule' | 'settings' | 'setup' | 'ticket_types';
