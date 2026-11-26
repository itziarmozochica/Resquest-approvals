import { BaseResponse } from '../models/base-response';

export function success<T>(data: T): BaseResponse<T> {
  return new BaseResponse<T>(data, null);
}

export function failure<T>(error: unknown): BaseResponse<T> {
  return new BaseResponse<T>(null, error);
}
