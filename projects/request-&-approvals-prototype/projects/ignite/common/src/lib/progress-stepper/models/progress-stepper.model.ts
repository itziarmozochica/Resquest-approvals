/**
 * Visual status of a single step in the progress stepper.
 * - `upcoming` — not yet reached; track dot is non-interactive.
 * - `active` — the current step.
 * - `completed` — already visited; track dot is clickable.
 * - `error` — validation or save failed; track dot is clickable.
 */
export type IgntProgressStepperItemState = 'upcoming' | 'active' | 'completed' | 'error';

/**
 * One step in an `ignt-progress-stepper` flow.
 */
export interface IgntProgressStepperItem {
  id: string;
  label: string;
  description?: string;
  ariaLabel?: string;
  hasError?: boolean;
}

/**
 * Payload emitted when a clickable track dot is activated.
 */
export interface IgntProgressStepperItemActivate {
  index: number;
  item: IgntProgressStepperItem;
}

/**
 * Derived view model for one step, used by the stepper template.
 */
export interface IgntProgressStepperViewItem {
  ariaLabel: string;
  hasDescription: boolean;
  index: number;
  isConnectorReached: boolean;
  isInteractive: boolean;
  item: IgntProgressStepperItem;
  showConnector: boolean;
  state: IgntProgressStepperItemState;
  stepNumber: number;
}
