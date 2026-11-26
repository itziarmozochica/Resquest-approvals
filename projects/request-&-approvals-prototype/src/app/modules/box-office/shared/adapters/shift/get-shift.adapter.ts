import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../../../shared/models/base-response';
import { ShiftDTOAdapter } from '../../../shared/adapters/shift/shift-dto.adapter';
import { Shift, ShiftDTO } from '../../models/shifts.model';

export type GetShiftsApiResponseBody = BaseResponse<ShiftDTO>;

@Injectable({
  providedIn: 'root',
})
export class GetShiftAdapter implements AdapterInterface<Shift, GetShiftsApiResponseBody> {
  constructor(private shiftAdapter: ShiftDTOAdapter) {}

  fromApi(body: GetShiftsApiResponseBody): Shift {
    if (body.error != null) {
      throw this.getError(body.error);
    }
    if (body.data === null) {
      throw new Error('Data is null');
    }
    return this.getData(body.data);
  }

  private getData(data: ShiftDTO): Shift {
    return this.shiftAdapter.parseShiftDTO(data);
  }

  private getError({ code }: BaseErrorResponse): BaseErrorResponse {
    return { code: code, message: `errors.${code}` };
  }
}
