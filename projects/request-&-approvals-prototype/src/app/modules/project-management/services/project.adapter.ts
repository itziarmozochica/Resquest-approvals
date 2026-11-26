import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseAdapter } from '../../../core/base.adapter';
import { BaseResponse } from '../../../shared/models/base-response';
import { ProjectApiDto } from '../models/project-api.model';
import { mapProjectDtoToProject } from '../models/project.mapper';
import { Project } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectAdapter extends BaseAdapter implements AdapterInterface<BaseResponse<Project | null>, BaseResponse<ProjectApiDto>> {
  fromApi(response: BaseResponse<ProjectApiDto>): BaseResponse<Project | null> {
    const data = response?.data ? mapProjectDtoToProject(response.data) : null;
    return new BaseResponse<Project | null>(data, this.getError(response?.error));
  }
}
