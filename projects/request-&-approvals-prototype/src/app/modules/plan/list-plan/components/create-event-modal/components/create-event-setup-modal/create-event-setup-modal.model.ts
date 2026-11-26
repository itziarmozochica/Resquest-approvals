import { CreateEventType } from '../../create-event.model';

export interface CreateEventSetupModalData {
  readonly eventType: CreateEventType;
  readonly showQuickSetup: boolean;
}

export type CreateEventSetupModalResult = 'advanced-setup' | 'duplicate-event' | 'quick-setup' | null;

export interface CreateEventSetupOption {
  actionable: boolean;
  descriptionKey: string;
  icon: string;
  id: string;
  titleKey: string;
}
