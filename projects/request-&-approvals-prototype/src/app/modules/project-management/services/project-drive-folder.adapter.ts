import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseAdapter } from '../../../core/base.adapter';
import { BaseResponse } from '../../../shared/models/base-response';
import { ProjectDriveFolder, ProjectDriveFolderApiDto } from '../models/project-drive-folder.model';

@Injectable({ providedIn: 'root' })
export class ProjectDriveFolderAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<ProjectDriveFolder | null>, BaseResponse<ProjectDriveFolderApiDto>>
{
  fromApi(response: BaseResponse<ProjectDriveFolderApiDto>): BaseResponse<ProjectDriveFolder | null> {
    const data: ProjectDriveFolder | null = response?.data
      ? { driveFolderId: response.data.drive_folder_id, driveFolderUrl: response.data.drive_folder_url }
      : null;
    return new BaseResponse<ProjectDriveFolder | null>(data, this.getError(response?.error));
  }
}
