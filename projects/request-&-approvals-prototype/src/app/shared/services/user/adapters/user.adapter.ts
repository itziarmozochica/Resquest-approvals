import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { Business } from '../../../../modules/settings/shared/models/business.model';
import { BaseErrorResponse, BaseResponse } from '../../../models/base-response';
import { User, UserData } from '../../../models/user/user.model';
import { Channel } from '../../session-availability/channel.enum';

@Injectable({
  providedIn: 'root',
})
export class UserAdapter implements AdapterInterface<BaseResponse<User | null>> {
  fromApi(response: BaseResponse<UserData | null>): BaseResponse<User> {
    return new BaseResponse<User>(this.getData(response.data), this.getError(response.error));
  }

  private getError(data: BaseErrorResponse | null) {
    if (data == null) {
      return null;
    }

    return { code: data.code, message: data.message };
  }

  private getData(data: UserData | null): User | null {
    if (data) {
      let business: Business | undefined = undefined;
      if (data.business) {
        business = {
          id: data.business.id,
          userId: data.id,
          name: data.business.name,
          email: data.business.email,
          phone: data.business.phone,
          contactName: data.business.contact_name,
          address: data.business.address,
          taxIdentificationNumber: data.business.tax_identification_number,
          language: data.business.language,
          channel: data.business.channel || Channel.Business,
          hasCustomChannel: data.business.has_custom_channel ?? false,
        } as Business; // type omitted from user API; populated by fetchBusinessDetailsForBusinessUser before consumption
      }

      return new User(data.id, data.email, data.language, data.name, data.type, data.interface, data.username, business);
    }
    return null;
  }
}
