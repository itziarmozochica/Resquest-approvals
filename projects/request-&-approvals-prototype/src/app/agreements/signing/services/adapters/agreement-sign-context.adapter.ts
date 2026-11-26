import { Injectable } from '@angular/core';

import { SignerRole } from '../../../requirements/enums/signer-role.enum';
import { IndividualAgreementStatus } from '../../enums/individual-agreement-status.enum';
import { AgreementSignContext } from '../../models/agreement-sign-context.model';
import { IndividualAgreementToSign, SignAgreementsPayload, SignAgreementsResult } from '../../models/sign-agreements.model';
import { AgreementSignContextDataDto } from '../dtos/agreement-sign-context.dto';
import { IndividualAgreementToSignDto, SignAgreementsDataDto, SignAgreementsRequestDto } from '../dtos/sign-agreements.dto';

@Injectable({ providedIn: 'root' })
export class AgreementSignContextAdapter {
  signContextFromApi(dto: AgreementSignContextDataDto): AgreementSignContext {
    return {
      agreements: dto.agreements.map(agreement => ({
        agreementId: agreement.agreement_id,
        agreementVersionId: agreement.agreement_version_id,
        individualAgreementIds: agreement.individual_agreement_ids,
        legalText: agreement.legal_text,
        signerRole: agreement.signer_role as SignerRole, // fever2 owns this vocabulary and the enum mirrors it
        title: agreement.title,
        validityDays: agreement.validity_days,
        version: agreement.version,
      })),
    };
  }

  signResultFromApi(dto: SignAgreementsDataDto): SignAgreementsResult {
    return {
      acceptanceId: dto.acceptance_id,
      acceptedAt: dto.accepted_at,
      individualAgreements: dto.individual_agreements.map(row => ({
        id: row.id,
        status: row.status as IndividualAgreementStatus, // fever2 owns this vocabulary and the enum mirrors it
      })),
    };
  }

  toSignRequestDto(payload: SignAgreementsPayload): SignAgreementsRequestDto {
    return {
      agreement_version_id: payload.agreementVersionId,
      guardian_declaration_accepted: payload.guardianDeclarationAccepted,
      individual_agreements: payload.individualAgreements.map(row => this.#toIndividualAgreementToSignDto(row)),
      signer: {
        email: payload.signer.email,
        first_name: payload.signer.firstName,
        last_name: payload.signer.lastName,
        phone_number: payload.signer.phoneNumber,
      },
    };
  }

  /**
   * fever2 rejects a name on a self-signed row and demands one on a guardian-signed row, so an
   * unnamed row travels as the id alone rather than as a pair of empty strings.
   */
  #toIndividualAgreementToSignDto(row: IndividualAgreementToSign): IndividualAgreementToSignDto {
    if (row.firstName === undefined || row.lastName === undefined) {
      return { id: row.id };
    }
    return { first_name: row.firstName, id: row.id, last_name: row.lastName };
  }
}
