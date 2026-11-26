import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../../shared/models/base-response';
import { OrderRescheduled, OrderRescheduledDTO, RescheduleOrder, RescheduleOrderDTO } from '../models/reschedule-order.model';

@Injectable({
  providedIn: 'root',
})
export class RescheduleOrderAdapter implements AdapterInterface<BaseResponse<OrderRescheduled>> {
  fromApi(response: BaseResponse<OrderRescheduledDTO>): BaseResponse<OrderRescheduled> {
    return new BaseResponse<OrderRescheduled>(this.getData(response?.data ?? null), this.getError(response?.error));
  }

  toApi({ sessions, b2bUser, onsiteSetupId }: RescheduleOrder): RescheduleOrderDTO {
    return {
      sessions: sessions.map(sessionItem => ({
        session_id: sessionItem.sessionId,
        ticket_number: sessionItem.ticketNumber,
      })),
      b2b_user: {
        b2b_user_id: b2bUser.b2bUserId,
        b2b_user_email: b2bUser.b2bUserEmail,
        b2b_user_name: b2bUser.b2bUserName,
        b2b_user_username: b2bUser.b2bUserUsername,
        b2b_user_interface: b2bUser.b2bUserInterface,
      },
      ...(onsiteSetupId !== undefined ? { onsite_setup_id: onsiteSetupId } : {}),
    };
  }

  private getData(data: OrderRescheduledDTO | null): OrderRescheduled {
    return {
      orderId: data?.order_id,
      cartId: data?.cart_id,
    };
  }

  private getError(data: any): { code: string; message: string } | null {
    if (!data?.code) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}
