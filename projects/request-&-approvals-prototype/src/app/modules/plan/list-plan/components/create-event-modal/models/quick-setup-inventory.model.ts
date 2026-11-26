import { FormArray, FormControl, FormGroup } from '@angular/forms';

import {
  AllowedNumTickets,
  SessionTypeGroupFrequency,
  SessionTypeSelectionRule,
} from '@fz-original/app/shared/services/sessions/session-type.model';

export interface QuickSetupInventoryTierPrices {
  normal?: number;
  peak?: number;
  valley?: number;
}

export interface QuickSetupInventoryNeededSessionType {
  max: number;
  min: number;
  session_type_name: string;
}

export interface QuickSetupInventoryRules {
  selection_rule: SessionTypeSelectionRule;
  needed_session_types?: QuickSetupInventoryNeededSessionType[];
  visible_only_when_needed_session_types_selected?: boolean;
}

export interface QuickSetupInventoryItem {
  max_capacity: number | null;
  name: string;
  product_type: string;
  allowed_num_tickets?: AllowedNumTickets;
  details?: string;
  id?: number;
  instructions?: string;
  price?: number;
  rules?: QuickSetupInventoryRules;
  tier_prices?: QuickSetupInventoryTierPrices;
}

export type QuickSetupCapacityGroupFrequency =
  | SessionTypeGroupFrequency.perTimeSlot
  | SessionTypeGroupFrequency.perDay
  | SessionTypeGroupFrequency.perPlan;

export const QUICK_SETUP_CAPACITY_GROUP_FREQUENCIES: readonly QuickSetupCapacityGroupFrequency[] = [
  SessionTypeGroupFrequency.perTimeSlot,
  SessionTypeGroupFrequency.perDay,
  SessionTypeGroupFrequency.perPlan,
];

export const QUICK_SETUP_DEFAULT_CAPACITY_GROUP_FREQUENCY: QuickSetupCapacityGroupFrequency = SessionTypeGroupFrequency.perTimeSlot;

export interface QuickSetupCapacityGroup {
  frequency: QuickSetupCapacityGroupFrequency;
  max_capacity: number | null;
  name: string;
  tickets: QuickSetupInventoryItem[];
  id?: number;
}

export interface QuickSetupInventoryPayload {
  add_ons: QuickSetupInventoryItem[];
  capacity_groups: QuickSetupCapacityGroup[];
  total_capacity: number;
  ungrouped_tickets: QuickSetupInventoryItem[];
}

export interface QuickSetupInventoryAssignedIds {
  addOnIdsByName: Record<string, number>;
  groupIdsByName: Record<string, number>;
  ticketIdsByName: Record<string, number>;
}

export interface QuickSetupInventoryItemFormValue {
  details: string;
  id: number | null;
  instructions: string;
  maxCapacity: number | null;
  maxToSell: number | null;
  minToSell: number | null;
  name: string;
  neededSessionTypes: string[];
  normalPrice: number | null;
  peakPrice: number | null;
  price: number | null;
  productType: string;
  selectionRule: string;
  valleyPrice: number | null;
}

export interface QuickSetupInventoryGroupFormValue {
  frequency: QuickSetupCapacityGroupFrequency;
  id: number | null;
  maxCapacity: number | null;
  name: string;
  tickets: QuickSetupInventoryItemFormValue[];
}

export interface QuickSetupInventoryPrefill {
  addOns: QuickSetupInventoryItemFormValue[];
  groups: QuickSetupInventoryGroupFormValue[];
  isPricesByTier: boolean;
  totalCapacity: number | null;
  ungroupedTickets: QuickSetupInventoryItemFormValue[];
}

export type QuickSetupInventoryItemForm = FormGroup<{
  [Field in keyof QuickSetupInventoryItemFormValue]: FormControl<QuickSetupInventoryItemFormValue[Field]>;
}>;

export type QuickSetupInventoryGroupForm = FormGroup<{
  frequency: FormControl<QuickSetupCapacityGroupFrequency>;
  id: FormControl<number | null>;
  maxCapacity: FormControl<number | null>;
  name: FormControl<string>;
  tickets: FormArray<QuickSetupInventoryItemForm>;
}>;
