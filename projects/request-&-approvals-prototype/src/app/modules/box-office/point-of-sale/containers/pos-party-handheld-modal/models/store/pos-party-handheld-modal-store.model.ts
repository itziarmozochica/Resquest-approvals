import type { MultiStepNavigationState } from '@fz-original/app/shared/multi-step-modal/store/multi-step-navigation.model';

import type { PosPartyHandheldContext, PosPartyHandheldSheet } from '../pos-party-handheld-modal.model';

export interface PosPartyHandheldModalState extends MultiStepNavigationState<PosPartyHandheldSheet> {
  context: PosPartyHandheldContext;
}

export const initialPosPartyHandheldModalState: PosPartyHandheldModalState = {
  context: { draftQuantities: {} },
  currentStepId: null,
  history: [],
};
