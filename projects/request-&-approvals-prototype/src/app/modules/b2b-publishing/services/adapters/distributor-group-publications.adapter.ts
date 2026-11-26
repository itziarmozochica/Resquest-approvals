import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../../shared/models/base-response';
import {
  DistributorGroupPublicationDetail,
  DistributorGroupPublicationFailedEvent,
} from '../../models/distributor-group-publication-detail.model';
import { DistributorGroupPublicationStatusEnum } from '../../models/distributor-group-publication-status.enum';
import { DistributorGroupPublication } from '../../models/distributor-group-publication.model';
import {
  DistributorGroupLatestPublicationDto,
  DistributorGroupPublicationDetailDto,
  DistributorGroupPublicationDto,
  DistributorGroupPublicationsDto,
} from '../dtos/distributor-group-publication.dto';

@Injectable({
  providedIn: 'root',
})
export class DistributorGroupPublicationsAdapter implements AdapterInterface<BaseResponse<DistributorGroupPublication[]>> {
  fromApi(response: HttpResponse<BaseResponse<DistributorGroupPublicationsDto>>): BaseResponse<DistributorGroupPublication[]> {
    const body = response.body;
    const publications = (body?.data?.publications ?? []).map(dto => this.#getPublication(dto));

    return new BaseResponse<DistributorGroupPublication[]>(publications, this.#getError(body?.error));
  }

  latestFromApi(
    response: HttpResponse<BaseResponse<DistributorGroupLatestPublicationDto>>,
  ): BaseResponse<DistributorGroupPublicationDetail> {
    const body = response.body;
    const dto = body?.data?.publication ?? null;

    return new BaseResponse<DistributorGroupPublicationDetail>(dto ? this.#getDetail(dto) : null, this.#getError(body?.error));
  }

  #getDetail(dto: DistributorGroupPublicationDetailDto): DistributorGroupPublicationDetail {
    return new DistributorGroupPublicationDetail(
      dto.id,
      dto.group_id,
      this.#getStatus(dto.status),
      (dto.failures ?? []).map(
        failure => new DistributorGroupPublicationFailedEvent(failure.plan_id, failure.plan_name ?? null, failure.code, failure.reason),
      ),
    );
  }

  #getError(error: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (!error) {
      return null;
    }
    return { code: error.code, message: error.message };
  }

  #getPublication(dto: DistributorGroupPublicationDto): DistributorGroupPublication {
    return new DistributorGroupPublication(
      dto.id,
      dto.group_id,
      dto.group_name,
      this.#getStatus(dto.status),
      dto.requested_count,
      dto.published_count,
      dto.failed_count,
      dto.run_requested_count ?? dto.requested_count,
    );
  }

  #getStatus(status: string): DistributorGroupPublicationStatusEnum {
    return status === DistributorGroupPublicationStatusEnum.RUNNING
      ? DistributorGroupPublicationStatusEnum.RUNNING
      : DistributorGroupPublicationStatusEnum.FINISHED;
  }
}
