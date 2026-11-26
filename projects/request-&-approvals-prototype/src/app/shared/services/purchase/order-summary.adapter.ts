import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { ValidationOrderSummary } from '../../models/order/order-summary.model';
import { OrderSummaryDTO } from './models/order-summary.dto';

@Injectable({
  providedIn: 'root',
})
export class OrderSummaryAdapter implements AdapterInterface<ValidationOrderSummary, OrderSummaryDTO> {
  fromApi(dto: OrderSummaryDTO): ValidationOrderSummary {
    return {
      buyer: {
        email: dto.buyer.email,
        fullName: dto.buyer.full_name,
      },
      channelName: dto.channel_name ?? null,
      createdAt: dto.created_at,
      id: dto.id,
      numberOfTickets: dto.number_of_tickets,
      planName: dto.plan_name ?? null,
      placeTimezone: dto.place_timezone ?? null,
      reference: dto.reference,
      sessionDate: dto.session_date ?? null,
      sessionSummary: dto.session_summary ?? null,
      status: dto.status,
    };
  }
}
