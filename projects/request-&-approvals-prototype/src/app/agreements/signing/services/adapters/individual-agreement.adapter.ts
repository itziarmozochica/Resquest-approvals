import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { CoverageRule } from '../../../requirements/enums/coverage-rule.enum';
import { SignerRole } from '../../../requirements/enums/signer-role.enum';
import { IndividualAgreementStatus } from '../../enums/individual-agreement-status.enum';
import { IndividualAgreement } from '../../models/individual-agreement.model';
import { OrderAgreements } from '../../models/order-agreements.model';
import { IndividualAgreementDto } from '../dtos/individual-agreement.dto';
import { OrderAgreementsDataDto } from '../dtos/order-agreements-data.dto';

/**
 * Every field of fever2's agreement schemas is required and validated on the way out, so this maps
 * them straight across: the only branching is on the fields the contract itself declares nullable, plus
 * `claimed`, which defaults to false until fever2 always sends it (see its @todo in the DTO).
 * The service rejects a response whose envelope has no `data`, which is the one shape that can
 * actually reach us malformed.
 */
@Injectable({ providedIn: 'root' })
export class IndividualAgreementAdapter implements AdapterInterface<IndividualAgreement, IndividualAgreementDto> {
  fromApi(dto: IndividualAgreementDto): IndividualAgreement {
    return {
      agreement: { id: dto.agreement.id, title: dto.agreement.title },
      coverageRule: dto.coverage_rule as CoverageRule, // fever2 owns this vocabulary and the enum mirrors it
      expiresAt: dto.expires_at,
      id: dto.id,
      identified: dto.identified,
      isClaimed: dto.claimed ?? false,
      orderItemId: dto.order_item_id,
      participant: dto.participant === null ? null : { label: dto.participant.label },
      signerRole: dto.signer_role as SignerRole, // fever2 owns this vocabulary and the enum mirrors it
      signUrl: dto.sign_url,
      status: dto.status as IndividualAgreementStatus, // fever2 owns this vocabulary; an unknown value fails closed in getAgreementStatusTag
      ticketId: dto.ticket_id,
    };
  }

  orderAgreementsFromApi(dto: OrderAgreementsDataDto): OrderAgreements {
    return {
      individualAgreements: dto.individual_agreements.map(item => this.fromApi(item)),
      orderId: dto.order_id,
      summary: { required: dto.summary.required, signed: dto.summary.signed },
    };
  }
}
