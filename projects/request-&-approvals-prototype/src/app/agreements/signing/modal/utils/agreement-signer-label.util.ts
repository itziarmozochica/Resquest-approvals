import type { TranslateService } from '@ngx-translate/core';

import { IndividualAgreementStatus } from '../../enums/individual-agreement-status.enum';
import type { IndividualAgreement } from '../../models/individual-agreement.model';
import type { OrderAgreementSigner } from '../../models/order-agreement-signer.model';

export function getAgreementSignerLabels(
  agreements: readonly IndividualAgreement[],
  signers: readonly OrderAgreementSigner[],
  translate: Pick<TranslateService, 'instant'>,
): Record<string, string | null> {
  return Object.fromEntries(
    agreements.map((agreement: IndividualAgreement): [string, string | null] => {
      const signer = signers.find((entry: OrderAgreementSigner) => entry.individualAgreementId === agreement.id);
      if (signer === undefined || agreement.status !== IndividualAgreementStatus.signed) {
        return [agreement.id, null];
      }
      if (agreement.participant === null) {
        return [agreement.id, translate.instant('agreements.signing.modal.list.wholeOrderSignedBy', { signer: signer.signerName })];
      }
      if (signer.minorName !== null) {
        return [
          agreement.id,
          translate.instant('agreements.signing.modal.list.signedByGuardian', { minor: signer.minorName, signer: signer.signerName }),
        ];
      }
      return [agreement.id, signer.signerName];
    }),
  );
}
