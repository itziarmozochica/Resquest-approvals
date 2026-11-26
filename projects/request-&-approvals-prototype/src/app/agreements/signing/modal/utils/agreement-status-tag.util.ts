import type { TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

import { IndividualAgreementStatus } from '../../enums/individual-agreement-status.enum';

export interface AgreementStatusTag {
  labelKey: string;
  sentiment: TagSentiment;
}

const agreementStatusTags: Record<IndividualAgreementStatus, AgreementStatusTag> = {
  [IndividualAgreementStatus.actionRequired]: { labelKey: 'agreements.signing.modal.status.actionRequired', sentiment: 'danger' },
  [IndividualAgreementStatus.expired]: { labelKey: 'agreements.signing.modal.status.expired', sentiment: 'danger' },
  [IndividualAgreementStatus.pending]: { labelKey: 'agreements.signing.modal.status.pending', sentiment: 'warning' },
  [IndividualAgreementStatus.signed]: { labelKey: 'agreements.signing.modal.status.signed', sentiment: 'positive' },
};

/**
 * Maps an individual agreement status onto the `ignt-tag` sentiment and i18n label that render it.
 *
 * Fail-closed: a status this build does not know degrades to the action-required tag, never to a
 * reassuring one. These rows gate ticket delivery on a signed waiver, so an operator reading an
 * unrecognised status must be sent to look rather than waved through. Same rule, and same reason,
 * as B2C's `BadgePresentationService`.
 */
export function getAgreementStatusTag(status: IndividualAgreementStatus): AgreementStatusTag {
  return agreementStatusTags[status] ?? agreementStatusTags[IndividualAgreementStatus.actionRequired];
}
