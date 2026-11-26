import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { CrossEventBulkEditTrackingStep } from '../models/cross-event-bulk-edit-tracking.model';

export interface CrossEventBulkEditSelectEventsStepCompletedData {
  eventsCount: number;
  onSaleEventsCount: number;
  step: typeof CrossEventBulkEditTrackingStep.selectEvents;
  usedSelectAll: boolean;
  venuesCount: number;
}

export interface CrossEventBulkEditSelectProductsStepCompletedData {
  productGroupsCount: number;
  productsCount: number;
  spellingSuggestionsAccepted: number;
  step: typeof CrossEventBulkEditTrackingStep.selectProducts;
}

export interface CrossEventBulkEditEditPropertiesStepCompletedData {
  properties: readonly string[];
  propertiesCount: number;
  step: typeof CrossEventBulkEditTrackingStep.editProperties;
}

export type CrossEventBulkEditStepCompletedData =
  | CrossEventBulkEditEditPropertiesStepCompletedData
  | CrossEventBulkEditSelectEventsStepCompletedData
  | CrossEventBulkEditSelectProductsStepCompletedData;

export const crossEventBulkEditStepCompleted = defineEvent<CrossEventBulkEditStepCompletedData>('crossEventBulkEdit.stepCompleted');
