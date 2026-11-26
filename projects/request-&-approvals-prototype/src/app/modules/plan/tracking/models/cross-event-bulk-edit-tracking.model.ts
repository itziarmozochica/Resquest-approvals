export const CrossEventBulkEditTrackingStep = {
  editProperties: 'edit_properties',
  selectEvents: 'select_events',
  selectProducts: 'select_products',
} as const;

export type CrossEventBulkEditTrackingStepValue = (typeof CrossEventBulkEditTrackingStep)[keyof typeof CrossEventBulkEditTrackingStep];

export const CrossEventBulkEditTrackedProperty = {
  allowedNumTickets: 'min/max',
  details: 'details',
  instructions: 'instructions',
  label: 'label',
  productType: 'product type',
  selectionRule: 'selection rule',
} as const;
