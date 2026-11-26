import type { MultiStepModalConfig } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';

import type { AgreementSigningContext, AgreementSigningIntent, AgreementSigningStepId } from '../models/agreement-signing-modal.model';

type AgreementSigningModalConfig = MultiStepModalConfig<AgreementSigningContext, AgreementSigningStepId, AgreementSigningIntent>;

function hasSelectedAgreement(context: AgreementSigningContext): boolean {
  return context.selectedAgreementId !== null;
}

/** The reserved `back` / `cancel` / `close` intents are owned by the generic shell, so they are absent from `transitions`. */
export const agreementSigningModalConfig: AgreementSigningModalConfig = {
  steps: {
    agreementDocument: {
      actions: [],
      canEnter: hasSelectedAgreement,
      chrome: { disableClose: false, showBack: true, showClose: true, showProgress: false },
      id: 'agreementDocument',
      titleKey: 'agreements.signing.modal.document.title',
      transitions: [{ on: 'continueToSign', target: 'signerInfo' }],
      loader: () => import('../steps/agreement-document/agreement-document-step.component').then(m => m.AgreementDocumentStepComponent),
    },
    agreementList: {
      actions: [],
      chrome: { disableClose: false, showBack: false, showClose: true, showProgress: false },
      id: 'agreementList',
      prefetch: ['agreementDocument'],
      titleKey: 'agreements.signing.modal.list.title',
      transitions: [{ on: 'openDocument', target: 'agreementDocument' }],
      loader: () => import('../steps/agreement-list/agreement-list-step.component').then(m => m.AgreementListStepComponent),
    },
    signComplete: {
      actions: [],
      // No back: the signature is already recorded, so re-entering the signer form makes no sense.
      chrome: { disableClose: false, showBack: false, showClose: true, showProgress: false },
      id: 'signComplete',
      titleKey: 'agreements.signing.modal.success.title',
      transitions: [{ on: 'finishSigning', target: 'agreementList' }],
      loader: () => import('../steps/sign-complete/sign-complete-step.component').then(m => m.SignCompleteStepComponent),
    },
    signerInfo: {
      actions: [],
      canEnter: hasSelectedAgreement,
      chrome: { disableClose: false, showBack: true, showClose: true, showProgress: false },
      id: 'signerInfo',
      prefetch: ['signComplete'],
      titleKey: 'agreements.signing.modal.signer.title',
      transitions: [{ on: 'signCompleted', target: 'signComplete' }],
      loader: () => import('../steps/signer-info/signer-info-step.component').then(m => m.SignerInfoStepComponent),
    },
  },
  initialStepId: context => (hasSelectedAgreement(context) ? 'agreementDocument' : 'agreementList'),
};
