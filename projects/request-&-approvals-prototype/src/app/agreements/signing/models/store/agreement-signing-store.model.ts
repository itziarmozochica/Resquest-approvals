import { SignerRole } from '../../../requirements/enums/signer-role.enum';
import type { AgreementSigningContext, AgreementSigningStepId } from '../../modal/models/agreement-signing-modal.model';
import { AgreementSignContext } from '../agreement-sign-context.model';
import { OrderAgreementSigner } from '../order-agreement-signer.model';
import { OrderAgreementsSummary } from '../order-agreements.model';
import { SignReceipt } from '../sign-receipt.model';

export type SigningListState = 'error' | 'idle' | 'loaded' | 'loading';

export interface AgreementSigningState {
  /** The operator's answer to an age-based agreement's "Who are you signing for?", `null` until they answer. */
  readonly answeredSignerRole: Exclude<SignerRole, SignerRole.AgeBased> | null;
  /**
   * Navigation context consumed by the multi-step modal config guards, and the single home of the
   * order this modal is about: the engine reads nothing else, so keeping a second copy beside it
   * would only give the two a chance to disagree.
   */
  readonly context: AgreementSigningContext;
  readonly currentStepId: AgreementSigningStepId | null;
  readonly signContext: AgreementSignContext | null;
  readonly signContextError: unknown;
  readonly signReceipt: SignReceipt | null;
  readonly error: unknown;
  readonly signError: unknown;
  readonly hasLoaded: boolean;
  readonly history: AgreementSigningStepId[];
  readonly isLoading: boolean;
  readonly isLoadingSignContext: boolean;
  readonly isOpenedForOneAgreement: boolean;
  readonly isSigning: boolean;
  /** fever2 refused the last sign because a newer version was published after the document was opened. */
  readonly isVersionSuperseded: boolean;
  readonly signers: OrderAgreementSigner[];
  readonly summary: OrderAgreementsSummary | null;
}

export const initialState: AgreementSigningState = {
  answeredSignerRole: null,
  context: { orderId: null, partnerId: null, selectedAgreementId: null },
  currentStepId: null,
  signContext: null,
  signContextError: null,
  signReceipt: null,
  error: null,
  signError: null,
  hasLoaded: false,
  history: [],
  isLoading: false,
  isLoadingSignContext: false,
  isOpenedForOneAgreement: false,
  isSigning: false,
  isVersionSuperseded: false,
  signers: [],
  summary: null,
};
