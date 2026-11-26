import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseAdapter } from '../../../core/base.adapter';
import { BaseResponse } from '../../../shared/models/base-response';
import { ProjectApiDto, ProjectsListApiResponse } from '../models/project-api.model';
import { mapProjectDtoToProject } from '../models/project.mapper';
import { Project, ProjectsPendingTotals } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<Project[]>, BaseResponse<ProjectsListApiResponse | null>>
{
  fromApi(response: BaseResponse<ProjectsListApiResponse | null>): BaseResponse<Project[]> {
    const data = response?.data?.projects ? response.data.projects.map((dto: ProjectApiDto) => mapProjectDtoToProject(dto)) : null;
    return new BaseResponse<Project[]>(data, this.getError(response?.error));
  }

  pendingTotalsFromApi(response: BaseResponse<ProjectsListApiResponse | null>): ProjectsPendingTotals {
    return {
      informationRequests: this.#total(response?.data?.pending_information_requests_total),
      approvals: this.#total(response?.data?.pending_approvals_total),
      evaluationInformationRequests: this.#total(response?.data?.pending_evaluation_information_requests_total),
      evaluationApprovals: this.#total(response?.data?.pending_evaluation_approvals_total),
    };
  }

  #total(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}
