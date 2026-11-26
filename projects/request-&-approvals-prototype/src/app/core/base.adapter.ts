import { BaseErrorResponse } from '../shared/models/base-response';

export abstract class BaseAdapter {
  protected getError(data: BaseErrorResponse | null): BaseErrorResponse | null {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}
