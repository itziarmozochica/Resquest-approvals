import {
  SessionType,
  SessionTypeBulkEditPropertyValue,
  SessionTypeBulkEditValues,
  SessionTypeGroup,
} from '@fz-original/app/shared/services/sessions/session-type.model';

export const crossEventBulkEditPlanSelectionLimit = 50;
export const crossEventBulkEditTicketTypeSelectionLimit = 200;

export const CrossEventBulkEditPanelStep = {
  properties: 'properties',
  ticketTypes: 'ticketTypes',
  values: 'values',
} as const;

export type CrossEventBulkEditPanelStepValue = (typeof CrossEventBulkEditPanelStep)[keyof typeof CrossEventBulkEditPanelStep];

export interface CrossEventBulkEditPlanName {
  id: number;
  isOnSale: boolean;
  isPublished: boolean;
  name: string;
  placeId: number | null;
}

export interface CrossEventBulkEditStoreState {
  isSubmitting: boolean;
  panelStep: CrossEventBulkEditPanelStepValue;
  planNames: Record<number, string>;
  planOnSale: Record<number, boolean>;
  planPlaceIds: Record<number, number | null>;
  planPublished: Record<number, boolean>;
  selectedPlanIds: number[];
  selectedProperties: SessionTypeBulkEditPropertyValue[];
  selectedTicketTypeIds: number[];
  sessionTypeGroups: SessionTypeGroup[];
  sessionTypePlanIds: Record<number, number>;
  sessionTypes: SessionType[];
  submitError: unknown | null;
  usedSelectAll: boolean;
  values: SessionTypeBulkEditValues;
}

export const initialState: CrossEventBulkEditStoreState = {
  isSubmitting: false,
  panelStep: CrossEventBulkEditPanelStep.ticketTypes,
  planNames: {},
  planOnSale: {},
  planPlaceIds: {},
  planPublished: {},
  selectedPlanIds: [],
  selectedProperties: [],
  selectedTicketTypeIds: [],
  sessionTypeGroups: [],
  sessionTypePlanIds: {},
  sessionTypes: [],
  submitError: null,
  usedSelectAll: false,
  values: {},
};
