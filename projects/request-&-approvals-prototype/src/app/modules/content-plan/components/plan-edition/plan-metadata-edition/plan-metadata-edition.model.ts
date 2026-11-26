export type PlanMetadataEditionState = 'loading' | 'error' | 'notFound' | 'ok';

export type PlanMetadataControlName =
  | 'composerId'
  | 'composerName'
  | 'ensemble'
  | 'instrumentation'
  | 'musicGenre'
  | 'programId'
  | 'setlist';

export type PlanMetadataIntegerControlName = Extract<PlanMetadataControlName, 'composerId' | 'musicGenre' | 'programId'>;

export interface PlanMetadataRejection {
  fieldErrors: Partial<Record<PlanMetadataControlName, string>>;
  unmappedErrors: string[];
}
