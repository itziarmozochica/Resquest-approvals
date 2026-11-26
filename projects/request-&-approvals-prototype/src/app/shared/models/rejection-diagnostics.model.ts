export interface RejectionContext {
  code: number | null;
  constructorName: string;
  hasStack: boolean;
  message: string | null;
  name: string;
  visibilityState: DocumentVisibilityState;
}

export interface RejectionTags {
  'rejection.has_stack': boolean;
  'rejection.name': string;
}

export interface RejectionDiagnostics {
  context: RejectionContext;
  tags: RejectionTags;
}
