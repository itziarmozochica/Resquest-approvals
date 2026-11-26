export interface PlanMetadataData {
  composer_id: number | null;
  composer_name: string | null;
  ensemble: string | null;
  instrumentation: string | null;
  music_genre: number | null;
  program_id: number | null;
  setlist: string | null;
}

export interface PlanMetadata {
  composerId: number | null;
  composerName: string | null;
  ensemble: string | null;
  instrumentation: string | null;
  musicGenre: number | null;
  programId: number | null;
  setlist: string | null;
}

export type UpdatePlanMetadataData = PlanMetadataData;

export type UpdatePlanMetadata = PlanMetadata;

export interface UpdatedPlanMetadataData {
  main_plan_id: number;
  metadata: PlanMetadataData;
  updated_at: string | null;
}

export const PLAN_METADATA_API_FIELDS = [
  'composer_id',
  'composer_name',
  'ensemble',
  'instrumentation',
  'music_genre',
  'program_id',
  'setlist',
] as const;

export type PlanMetadataApiField = (typeof PLAN_METADATA_API_FIELDS)[number];
