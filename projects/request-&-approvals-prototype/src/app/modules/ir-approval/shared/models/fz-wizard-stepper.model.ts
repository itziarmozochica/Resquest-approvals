export type WizardStepState = 'done' | 'current' | 'current-error' | 'upcoming' | 'error';

export interface WizardStepView {
  id: string;
  label: string;
  state: WizardStepState;
  /** Optional hint shown under the label, e.g. "1 pending". */
  hint?: string;
}
