import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { SessionModel, SessionsSliceModel } from './sessions.model';

@Injectable({
  providedIn: 'root',
})
export class SessionsAdapter implements AdapterInterface<SessionsSliceModel> {
  fromApi(data: any): SessionsSliceModel {
    const sessions: SessionModel[] = data.results.map((sessionData: any) => ({
      id: sessionData.id,
      isExpired: sessionData.is_expired,
      isSoldOut: sessionData.sold_out,
      availableTickets: sessionData.available_tickets,
      name: sessionData.label,
      price: sessionData.price,
      startDate: new Date(sessionData.starts_at),
      endDate: new Date(sessionData.ends_at),
    }));
    return {
      sessions,
      nextPage: data.next,
      totalSessions: data.count,
    };
  }
}
