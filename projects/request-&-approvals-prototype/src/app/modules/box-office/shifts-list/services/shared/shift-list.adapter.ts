import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../../../shared/models/base-response';
import { LinkPaginationResponse } from '../../../../../shared/models/link-pagination-response';
import { removeEmptyKeys } from '../../../../../shared/utils/object.utils';
import { ShiftDTOAdapter } from '../../../shared/adapters/shift/shift-dto.adapter';
import { ShiftListQuery, ShiftListQueryDTO } from '../../../shared/models/shift-list-query';
import { Shift, ShiftDTO } from '../../../shared/models/shifts.model';

export type GetShiftsApiResponseBody = Pick<BaseResponse<ShiftDTO[]>, 'data' | 'error'>;
export type GetShiftsResponse = LinkPaginationResponse<Shift[]>;
export type GetShiftsApiResponse = HttpResponse<GetShiftsApiResponseBody>;

@Injectable({
  providedIn: 'root',
})
export class ShiftListAdapter implements AdapterInterface<GetShiftsResponse, GetShiftsApiResponse> {
  constructor(private shiftAdapter: ShiftDTOAdapter) {}

  fromApi(response: GetShiftsApiResponse): GetShiftsResponse {
    const body: GetShiftsApiResponseBody | null = response.body;
    if (!body) {
      return new LinkPaginationResponse<Shift[]>('', null, null);
    }

    return new LinkPaginationResponse<Shift[]>(response.headers.get('Link') || '', this.getData(body.data), this.#getError(body.error));
  }

  getData(data: ShiftDTO[] | null): Shift[] | null {
    return data?.map(dto => this.shiftAdapter.parseShiftDTO(dto)) ?? null;
  }

  toApi(query: ShiftListQuery): ShiftListQueryDTO {
    return removeEmptyKeys<ShiftListQueryDTO>({
      created_at_from: query?.createdAtFrom?.toISOString().split('Z')[0],
      created_at_to: query?.createdAtTo?.toISOString().split('Z')[0],
      status: query?.status,
      page: query?.page,
      items_per_page: query?.itemsPerPage,
      user_id: query?.userId,
      cash_register_id: query?.cashRegisterId,
      onsite_setup_id: query?.onsiteSetupId,
    });
  }

  #getError(data: BaseErrorResponse | null): BaseErrorResponse | null {
    return data ? { code: data.code, message: `errors.${data.code}` } : null;
  }
}
