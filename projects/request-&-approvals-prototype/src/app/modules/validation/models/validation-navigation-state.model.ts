export interface ValidationNavigationState {
  fromScan?: boolean;
}

export function readValidationNavigationState(): ValidationNavigationState {
  const state: unknown = history.state;
  return typeof state === 'object' && state !== null ? (state as ValidationNavigationState) : {};
}
