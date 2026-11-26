import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import { ProjectDriveFolder, ProjectDriveFolderApiDto } from '../models/project-drive-folder.model';
import { ProjectDriveFolderAdapter } from './project-drive-folder.adapter';

@Injectable({ providedIn: 'root' })
export class ProjectDriveFolderService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(ProjectDriveFolderAdapter);

  get(partnerId: number, launchId: string): Observable<BaseResponse<ProjectDriveFolder | null>> {
    return this.#http.get<BaseResponse<ProjectDriveFolderApiDto>>(this.#url(partnerId, launchId)).pipe(
      map(response => this.#adapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<ProjectDriveFolder | null>(error)),
    );
  }

  #url(partnerId: number, launchId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/projects/${launchId}/drive-folder/`;
  }
}
