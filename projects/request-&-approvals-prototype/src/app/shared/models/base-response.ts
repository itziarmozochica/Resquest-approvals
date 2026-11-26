import { HttpErrorResponse } from '@angular/common/http';

export interface HttpErrorResponseWithBaseError extends HttpErrorResponse {
  error: BaseResponse<null> | null;
}

export interface BaseErrorResponse<T extends number | string = number | string> {
  code: T;
  message: string;
  error?: any | Error; // This any should be replaced with the actual error type
  errorCode?: number;
  userError?: string;
}

export type IBaseResponse<T> = Omit<BaseResponse<T>, 'getError'>;

export type BaseResponseDTO<T> = Pick<BaseResponse<T>, 'data' | 'error'>;

export class BaseResponse<T, E = any> {
  constructor(
    public data: T | null,
    public error: E | any | BaseErrorResponse | undefined | null, // unknown should be replaced with the actual error type
  ) {
    this.error = this.getError(this.error);
  }

  private getError(error: BaseErrorResponse | undefined | null): BaseErrorResponse | null {
    if (!error) {
      return null;
    }
    return {
      code: error.code,
      error: error.error,
      errorCode: error.errorCode,
      message: error.message,
      ...(error.userError != null && { userError: error.userError }),
    };
  }
}
