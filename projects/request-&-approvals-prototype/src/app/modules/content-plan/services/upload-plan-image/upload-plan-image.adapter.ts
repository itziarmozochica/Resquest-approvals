import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../../shared/models/base-response';
import { UploadedFileApiResponse, UploadedFileResponse } from '../../models/file-upload-response';

type PostPlanImageApiResponse = BaseResponse<UploadedFileApiResponse>;
type PostPlanImageResponse = BaseResponse<UploadedFileResponse>;

@Injectable({
  providedIn: 'root',
})
export class UploadPlanImageAdapter implements AdapterInterface<PostPlanImageResponse, PostPlanImageApiResponse> {
  fromApi(response: PostPlanImageApiResponse): PostPlanImageResponse {
    return new BaseResponse(this.getData(response?.data), this.getError(response?.error));
  }

  private getData(data: UploadedFileApiResponse | null): UploadedFileResponse | null {
    return data ? { fileUrl: data.file_url } : null;
  }

  private getError(error: BaseErrorResponse): BaseErrorResponse | null {
    return error ? { code: error.code, message: `errors.${error.code}` } : null;
  }
}
