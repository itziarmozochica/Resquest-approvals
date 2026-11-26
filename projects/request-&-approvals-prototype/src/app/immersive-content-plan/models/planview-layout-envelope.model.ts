import type { ImmersiveLayoutDocument } from './immersive-layout-document.model';

export type GenerationState = 'failed' | 'processed' | 'processing' | 'scheduled';

export interface PlanviewLayoutGeneration {
  error: string | null;
  requested_at: string;
  requested_by: string;
  state: GenerationState;
}

export interface PlanviewLayout extends ImmersiveLayoutDocument {
  status: 'draft' | 'published';
}

export interface PlanviewLayoutEnvelope {
  generation: PlanviewLayoutGeneration | null;
  layout: PlanviewLayout | null;
}
