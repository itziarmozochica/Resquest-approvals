import { Injectable } from '@angular/core';

import { MfaEnrollment, MfaEnrollmentData } from '@fz-original/app/core/authentication/mfa-enrollment.model';

import { BaseResponse } from '../../shared/models/base-response';
import { AdapterInterface } from '../adapter.interface';
import { BaseAdapter } from '../base.adapter';

export const toMfaEnrollment = (data: MfaEnrollmentData): MfaEnrollment => ({
  enrollmentId: data.enrollment_id,
  secret: data.secret,
  uri: data.uri,
});

@Injectable({
  providedIn: 'root',
})
export class MfaEnrollmentAdapter extends BaseAdapter implements AdapterInterface<BaseResponse<MfaEnrollment>> {
  fromApi(response: BaseResponse<MfaEnrollmentData>): BaseResponse<MfaEnrollment> {
    return new BaseResponse<MfaEnrollment>(this.getData(response.data), this.getError(response.error));
  }

  private getData(data: MfaEnrollmentData | null): MfaEnrollment | null {
    if (data == null) {
      return null;
    }
    return toMfaEnrollment(data);
  }
}
