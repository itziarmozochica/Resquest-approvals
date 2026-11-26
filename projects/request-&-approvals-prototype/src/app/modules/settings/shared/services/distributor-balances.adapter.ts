import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse, BaseResponseDTO } from '../../../../shared/models/base-response';
import { DistributorBalanceDto, DistributorBalancesDto } from '../models/distributor-balance.dto';
import { DistributorBalance, DistributorBalances } from '../models/distributor-balance.model';

const OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/;

@Injectable({
  providedIn: 'root',
})
export class DistributorBalancesAdapter
  implements AdapterInterface<BaseResponse<DistributorBalances>, BaseResponseDTO<DistributorBalancesDto> | null>
{
  fromApi(response: BaseResponseDTO<DistributorBalancesDto> | null): BaseResponse<DistributorBalances> {
    return new BaseResponse<DistributorBalances>(this.getData(response?.data ?? null), response?.error ?? null);
  }

  private getData(data: DistributorBalancesDto | null): DistributorBalances | null {
    if (!data) {
      return null;
    }

    return {
      balances: (data.balances ?? []).map(balance => this.toDistributorBalance(balance)),
      count: data.count,
    };
  }

  private toDistributorBalance(dto: DistributorBalanceDto): DistributorBalance {
    return {
      amount: dto.amount,
      currency: dto.currency,
      lastUpdate: this.toInstant(dto.last_update),
      partnerId: dto.partner_id,
      partnerName: dto.partner_name,
    };
  }

  private toInstant(lastUpdate: string | null): string | null {
    if (lastUpdate === null) {
      return null;
    }

    return OFFSET.test(lastUpdate) ? lastUpdate : `${lastUpdate}Z`;
  }
}
