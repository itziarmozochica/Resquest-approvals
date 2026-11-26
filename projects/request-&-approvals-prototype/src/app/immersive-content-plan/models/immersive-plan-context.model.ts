import { InjectionToken, type Signal } from '@angular/core';

/**
 * What the immersive editor needs to know about the plan it is editing, kept apart from the host
 * that resolves it. Provided by `ImmersiveContentPlanEditorComponent`.
 */
export interface ImmersivePlanContext {
  /** `null` while unknown: the plan detail is loading or failed. */
  readonly isWaitlist: Signal<boolean | null>;
}

export const IMMERSIVE_PLAN_CONTEXT = new InjectionToken<ImmersivePlanContext>('IMMERSIVE_PLAN_CONTEXT');
