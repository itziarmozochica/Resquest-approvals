import { HttpErrorResponse } from '@angular/common/http';

import { isString } from '@fz-original/app/app/utils/ts/ts.util';

import { BaseErrorResponse } from '../../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';

export const UPLOAD_UNSUPPORTED_FILE_TYPE_ERROR_CODE = 'UPLOAD_UNSUPPORTED_FILE_TYPE';

export const UPLOAD_UNSUPPORTED_FILE_TYPE_I18N_KEY = 'planEdition.galleryEdition.unsupportedFileType';

const UNSUPPORTED_FILE_TYPE_API_ERROR_PATTERN = /file type .+ is not allowed/i;

export function isUnsupportedFileTypeUploadError(error: unknown): boolean {
  const apiErrorMessage = getUploadFileApiErrorMessage(error);

  return apiErrorMessage !== undefined && UNSUPPORTED_FILE_TYPE_API_ERROR_PATTERN.test(apiErrorMessage);
}

export function mapUploadPlanImageHttpError(error: unknown): BaseErrorResponse {
  if (isUnsupportedFileTypeUploadError(error)) {
    return {
      code: UPLOAD_UNSUPPORTED_FILE_TYPE_ERROR_CODE,
      message: UPLOAD_UNSUPPORTED_FILE_TYPE_I18N_KEY,
    };
  }

  return ErrorResponseUtils.getErrorResponseError(error);
}

function getUploadFileApiErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof HttpErrorResponse)) {
    return undefined;
  }

  const responseError = error.error?.error;

  return isString(responseError) ? responseError : undefined;
}
