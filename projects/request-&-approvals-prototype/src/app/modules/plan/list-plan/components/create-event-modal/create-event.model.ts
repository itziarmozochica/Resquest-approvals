import { CreateEventType } from '../../../../../shared/services/plan/create-event-type.model';

export type { CreateEventType };

export interface CreateEventFormData {
  catalogPlanId: number | null;
  title: string;
  type: CreateEventType;
  venueId: number | null;
}
