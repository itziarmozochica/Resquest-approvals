import type { IgntProgressStepperItemState } from '../models/progress-stepper.model';

/**
 * Clamps a host `currentIndex` to a valid step. Empty `itemCount` yields 0 so callers
 * can still derive a number; the stepper hides the header when there are no items.
 */
export function clampProgressStepperCurrentIndex(currentIndex: number, itemCount: number): number {
  const lastIndex: number = itemCount - 1;
  if (lastIndex < 0) {
    return 0;
  }
  return Math.min(Math.max(currentIndex, 0), lastIndex);
}

/**
 * Derives a step's visual state from its index relative to the current step.
 * `hasError` always wins so a failed step stays visible after the user moves on.
 */
export function resolveProgressStepperItemState(index: number, currentIndex: number, hasError: boolean): IgntProgressStepperItemState {
  if (hasError) {
    return 'error';
  }
  if (index < currentIndex) {
    return 'completed';
  }
  if (index === currentIndex) {
    return 'active';
  }
  return 'upcoming';
}

/**
 * Interpolates `{{current}}` and `{{total}}` placeholders in the mobile step-count label.
 */
export function formatStepCountLabel(template: string, current: number, total: number): string {
  return template.split('{{current}}').join(String(current)).split('{{total}}').join(String(total));
}
