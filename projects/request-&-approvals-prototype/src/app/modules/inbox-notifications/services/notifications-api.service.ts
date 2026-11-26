import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { InboxNotificationsAdapter } from '../adapters/inbox-notifications.adapter';
import { FindUserInboxResponseDto, NotificationDto } from '../models/inbox-notification.dto';
import { InboxNotification } from '../models/inbox-notification.model';
import { InboxNotificationsPage } from '../models/inbox-notifications-page.model';

const PAGE_SIZE = 20;
const EMPTY_PAGE: InboxNotificationsPage = { items: [], nextCursor: null, unseenCount: 0 };

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(InboxNotificationsAdapter);
  readonly #partnerService = inject(PartnerService);

  readonly #baseUrl = environment.notificationsInboxApiBaseUrl;

  getInboxPage(cursor: string | null = null): Observable<InboxNotificationsPage> {
    const partnerId = this.#getPartnerId();
    if (partnerId == null) return of(EMPTY_PAGE);

    let params = new HttpParams().set('limit', String(PAGE_SIZE));
    if (cursor != null) params = params.set('cursor', cursor);

    return this.#http
      .get<FindUserInboxResponseDto>(this.#notificationsUrl(partnerId), { params })
      .pipe(map(response => this.#adapter.fromApi(response)));
  }

  getNotificationById(id: string): Observable<InboxNotification> {
    const partnerId = this.#getPartnerId();
    if (partnerId == null) return throwError(() => new Error('Cannot fetch a notification without an active partner'));

    return this.#http
      .get<NotificationDto>(this.#notificationsUrl(partnerId, `/${id}`))
      .pipe(map(notification => this.#adapter.fromNotificationDto(notification)));
  }

  markSeen(id: string): Observable<void> {
    const partnerId = this.#getPartnerId();
    if (partnerId == null) return of(undefined);

    return this.#http.post<void>(this.#notificationsUrl(partnerId, `/${id}/seen`), null).pipe(map((): undefined => undefined));
  }

  #getPartnerId(): number | undefined {
    return this.#partnerService.getPartner()?.id;
  }

  #notificationsUrl(partnerId: number | string, path = ''): string {
    return `${this.#baseUrl}/partners/${partnerId}/notifications${path}`;
  }
}
