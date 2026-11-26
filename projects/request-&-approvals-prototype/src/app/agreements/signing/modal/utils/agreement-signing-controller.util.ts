import { computed } from '@angular/core';

import type { MultiStepModalController } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal-controller.model';

import type { AgreementSigningStore } from '../../services/agreement-signing.store';
import type { AgreementSigningContext, AgreementSigningIntent, AgreementSigningStepId } from '../models/agreement-signing-modal.model';

type AgreementSigningController = MultiStepModalController<AgreementSigningContext, AgreementSigningStepId, AgreementSigningIntent>;

/**
 * The store as the shell's controller, minus going back mid-acceptance: fever2 records the signature
 * anyway, and leaving would strand the operator on a cleared document with no confirmation.
 */
export function createAgreementSigningController(store: InstanceType<typeof AgreementSigningStore>): AgreementSigningController {
  return {
    canGoBack: computed(() => store.canGoBack() && !store.isSigning()),
    currentStep: store.currentStep,
    getStep: id => store.getStep(id),
    goBack: () => {
      if (!store.isSigning()) {
        store.goBack();
      }
    },
    isActionEnabled: action => store.isActionEnabled(action),
    isCloseVisible: store.isCloseVisible,
    isActionVisible: action => store.isActionVisible(action),
    isFooterSeparatorVisible: store.isFooterSeparatorVisible,
    isProgressVisible: store.isProgressVisible,
    progress: store.progress,
    transition: intent => store.transition(intent),
  };
}
