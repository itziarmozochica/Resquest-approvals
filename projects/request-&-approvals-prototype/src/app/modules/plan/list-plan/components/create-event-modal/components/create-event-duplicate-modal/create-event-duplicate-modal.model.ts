import { CreateEventType } from '../../create-event.model';

export interface CreateEventDuplicateModalData {
  readonly eventType: CreateEventType;
}

export type CreateEventDuplicateModalResult = 'back' | 'confirmed' | null;
