import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../../core/adapter.interface';
import { B2BUser, B2BUserDTO, StartShiftQuery, StartShiftQueryDTO } from '../../models/start-shift-query';
import { StartShiftResponse, StartShiftResponseDTO } from '../../models/start-shift-response';

@Injectable({
  providedIn: 'root',
})
export class StartShiftAdapter implements AdapterInterface<StartShiftResponse, StartShiftResponseDTO> {
  toApi(query: StartShiftQuery): StartShiftQueryDTO {
    return {
      city_id: query.cityId,
      b2b_user: this.b2bUserToApi(query.b2bUser),
      currency: query.currency,
      cash_register_id: query.cashRegisterId,
      initial_amount: query.initialAmount,
      onsite_setup_id: query.onsiteSetupId,
    };
  }

  fromApi(response: StartShiftResponseDTO): StartShiftResponse {
    return response;
  }

  private b2bUserToApi({ b2bUserEmail, b2bUserName, b2bUserUsername }: B2BUser): B2BUserDTO {
    return {
      b2b_user_email: b2bUserEmail ?? '',
      b2b_user_name: b2bUserName ?? '',
      b2b_user_username: b2bUserUsername ?? '',
    };
  }
}
