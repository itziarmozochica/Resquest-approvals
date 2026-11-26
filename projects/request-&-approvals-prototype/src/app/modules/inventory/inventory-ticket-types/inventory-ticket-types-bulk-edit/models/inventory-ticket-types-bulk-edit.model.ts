import { SessionType, SessionTypeBulkEditPropertyValue } from '@fz-original/app/shared/services/sessions/session-type.model';

export const BulkEditStep = {
  properties: 2,
  ticketTypes: 1,
  values: 3,
} as const;

export type BulkEditStepValue = (typeof BulkEditStep)[keyof typeof BulkEditStep];

export const BulkEditPropertySection = {
  advanced: 'advanced',
  basicSettings: 'basicSettings',
  conditionalRules: 'conditionalRules',
  content: 'content',
} as const;

export type BulkEditPropertySectionValue = (typeof BulkEditPropertySection)[keyof typeof BulkEditPropertySection];

export interface BulkEditPropertyOption {
  property: SessionTypeBulkEditPropertyValue;
  section: BulkEditPropertySectionValue;
  /**
   * Restricted to Fever staff, mirroring the single ticket type form.
   * Optional because only exceptional properties need it (e.g. ticket tier); when omitted,
   * the property is available to partners (`isSuperuserOnly !== true` in the filter).
   */
  isSuperuserOnly?: boolean;
  combinedWith?: SessionTypeBulkEditPropertyValue[];
  descriptionKey?: string;
  titleKey?: string;
}

export interface BulkEditPropertyOptionView extends BulkEditPropertyOption {
  descriptionKey: string;
  disabled: boolean;
  titleKey: string;
}

export interface BulkEditPropertySectionGroup {
  options: BulkEditPropertyOptionView[];
  section: BulkEditPropertySectionValue;
}

export interface BulkEditTicketTypesGroup {
  id: number | null;
  name: string;
  sessionTypes: SessionType[];
}
