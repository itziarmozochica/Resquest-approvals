import { Plan } from '@fz-original/app/shared/models/plan/plan.model';

export interface CrossEventBulkEditPlanPageRequest {
  mode: 'append' | 'replace';
  pageQuery: string;
  searchTerm: string;
}

export type CrossEventBulkEditPlanWithId = Plan & { id: number };
