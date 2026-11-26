import { CapacityTemplate } from '@fz-original/app/modules/inventory/shared/models/capacity-template.model';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { SessionTypeInventory } from '@fz-original/app/shared/services/sessions/session-type.model';

export interface CardItem {
  completed: boolean;
  label: string;
  optional?: boolean;
  permission?: string;
}

export interface SetupCard {
  disabled?: boolean;
  items: CardItem[];
  progress: number;
  status: 'completed' | 'in-progress' | 'not-started';
  title: string;
}

export interface ContentCompletion {
  content: boolean;
  media: boolean;
  tags: boolean;
  termsAndConditions: boolean;
  venue: boolean;
}

export interface InventoryCompletion {
  capacity: boolean;
  inventory: boolean;
  pricing: boolean;
  products: boolean;
}

export interface SetupProvider {
  getSettingsCardItems(plan: PlanCreationStatusData | null): CardItem[];
  getInventoryCardItems?: (input: {
    capacityTemplates: CapacityTemplate[];
    inventory: SessionTypeInventory | null;
    plan: PlanCreationStatusData | null;
  }) => CardItem[];
  shouldShowInventory: boolean;
}
