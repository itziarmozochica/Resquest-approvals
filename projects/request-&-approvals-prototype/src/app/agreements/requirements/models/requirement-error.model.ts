export type RequirementError =
  | { kind: 'duplicate' }
  | { fieldErrors: Record<string, string>; kind: 'validation' }
  | { kind: 'unknown'; message: string };
