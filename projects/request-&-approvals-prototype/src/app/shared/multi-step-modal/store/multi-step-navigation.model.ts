export interface MultiStepNavigationState<TStepId extends string> {
  currentStepId: TStepId | null;
  history: TStepId[];
}

export function initialMultiStepNavigationState<TStepId extends string>(): MultiStepNavigationState<TStepId> {
  return { currentStepId: null, history: [] };
}
