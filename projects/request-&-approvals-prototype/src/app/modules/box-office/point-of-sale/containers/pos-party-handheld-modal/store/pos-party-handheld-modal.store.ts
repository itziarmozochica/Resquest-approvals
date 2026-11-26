import { computed, inject } from '@angular/core';

import { withMultiStepNavigation } from '@fz-original/app/shared/multi-step-modal/store/with-multi-step-navigation.feature';
import { setPartyMemberQuantity, type PartyQuantities } from '@fz/ticketing';
import { IGNT_DIALOG_DATA } from '@ignite/common';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';

import type {
  PosPartyHandheldContext,
  PosPartyHandheldIntent,
  PosPartyHandheldModalData,
  PosPartyHandheldSheet,
} from '../models/pos-party-handheld-modal.model';
import { initialPosPartyHandheldModalState, type PosPartyHandheldModalState } from '../models/store/pos-party-handheld-modal-store.model';

/**
 * Sheet-scoped: provided by the host, so it dies with the sheet. The party is a draft in `context` until the
 * host commits it on Apply; the date sheet writes the date and the hour through to the POS stores.
 */
export const PosPartyHandheldModalStore = signalStore(
  withState<PosPartyHandheldModalState>(initialPosPartyHandheldModalState),
  withMultiStepNavigation<PosPartyHandheldContext, PosPartyHandheldSheet, PosPartyHandheldIntent>(),
  withComputed(store => ({
    draftQuantities: computed<PartyQuantities>(() => store.context().draftQuantities),
  })),
  withMethods(store => ({
    clearDraft(): void {
      patchState(store, { context: { draftQuantities: {} } });
    },
    setDraftQuantity(memberKey: string, quantity: number): void {
      patchState(store, { context: { draftQuantities: setPartyMemberQuantity(store.context().draftQuantities, memberKey, quantity) } });
    },
  })),
  withHooks({
    onInit(store): void {
      const data = inject<PosPartyHandheldModalData | null>(IGNT_DIALOG_DATA, { optional: true });

      patchState(store, { context: { draftQuantities: data?.quantities ?? {} } });
      store.initNavigation();
    },
  }),
);
