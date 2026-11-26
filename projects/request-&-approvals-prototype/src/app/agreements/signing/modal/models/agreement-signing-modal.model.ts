export type AgreementSigningStepId = 'agreementList' | 'agreementDocument' | 'signerInfo' | 'signComplete';

/**
 * Intents the modal can raise. The reserved `back` / `cancel` / `close` intents are handled by the
 * generic shell and must never appear in the config's `transitions`.
 */
export type AgreementSigningIntent = 'continueToSign' | 'finishSigning' | 'openDocument' | 'signCompleted';

/**
 * Navigation context read by the config guards. The engine hands guards and transition targets only
 * this object, so every piece of state a transition may branch on belongs here rather than beside it.
 */
export interface AgreementSigningContext {
  orderId: number | null;
  partnerId: number | null;
  selectedAgreementId: string | null;
}

/** Payload handed to the modal through `IGNT_DIALOG_DATA`. */
export interface AgreementSigningModalData {
  orderId: number;
  partnerId: number;
  individualAgreementId?: string;
}
