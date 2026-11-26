import {
  BulkEditPropertyOption,
  BulkEditPropertySection,
} from '@fz-original/app/modules/inventory/inventory-ticket-types/inventory-ticket-types-bulk-edit/models/inventory-ticket-types-bulk-edit.model';
import { SessionTypeBulkEditProperty } from '@fz-original/app/shared/services/sessions/session-type.model';

export const crossEventBulkEditHiddenProperties = [
  SessionTypeBulkEditProperty.group,
  SessionTypeBulkEditProperty.targetAttendee,
  SessionTypeBulkEditProperty.ticketTier,
] as const;

export const crossEventBulkEditPropertyOptions: BulkEditPropertyOption[] = [
  { property: SessionTypeBulkEditProperty.productType, section: BulkEditPropertySection.basicSettings },
  {
    descriptionKey: 'inventory.ticketTypes.bulkEdit.properties.label.description',
    property: SessionTypeBulkEditProperty.label,
    section: BulkEditPropertySection.content,
    titleKey: 'inventory.ticketTypes.bulkEdit.properties.label.title',
  },
  {
    combinedWith: [SessionTypeBulkEditProperty.details],
    descriptionKey: 'inventory.ticketTypes.bulkEdit.properties.instructionsAndDetails.description',
    property: SessionTypeBulkEditProperty.instructions,
    section: BulkEditPropertySection.content,
    titleKey: 'inventory.ticketTypes.bulkEdit.properties.instructionsAndDetails.title',
  },
  { property: SessionTypeBulkEditProperty.allowedNumTickets, section: BulkEditPropertySection.advanced },
  { property: SessionTypeBulkEditProperty.selectionRule, section: BulkEditPropertySection.conditionalRules },
];
