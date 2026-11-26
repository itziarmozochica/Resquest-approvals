export type SettingsListSectionState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty'; message: string }
  | { kind: 'results' };
