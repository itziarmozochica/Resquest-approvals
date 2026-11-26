export type QuickSetupFeedbackSource = 'quick_setup_review';

export interface QuickSetupFeedbackPayload {
  feedback: string;
  main_plan_id?: number;
  source: QuickSetupFeedbackSource;
}
