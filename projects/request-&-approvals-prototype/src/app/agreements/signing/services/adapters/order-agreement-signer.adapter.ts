import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { OrderAgreementSigner } from '../../models/order-agreement-signer.model';
import { OrderAgreementSignerDto } from '../dtos/order-agreement-signer.dto';

@Injectable({ providedIn: 'root' })
export class OrderAgreementSignerAdapter implements AdapterInterface<OrderAgreementSigner, OrderAgreementSignerDto> {
  fromApi(dto: OrderAgreementSignerDto): OrderAgreementSigner {
    return {
      acceptedAt: dto.accepted_at,
      individualAgreementId: dto.individual_agreement_id,
      minorName: dto.minor === null ? null : `${dto.minor.first_name} ${dto.minor.last_name}`,
      signerName: `${dto.signer.first_name} ${dto.signer.last_name}`,
    };
  }
}
