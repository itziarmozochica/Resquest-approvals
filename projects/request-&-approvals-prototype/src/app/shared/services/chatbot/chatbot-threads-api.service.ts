import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  ChatbotThreadDTO,
  ChatbotThreadHistoryDTO,
  ChatbotThreadHistoryQuery,
  ChatbotThreadListDTO,
  ChatbotThreadSearchQuery,
  ChatbotThreadsQuery,
  ChatbotThreadUpdateTitlePayload,
} from '@fz-original/app/shared/models/chatbot/chatbot-thread.model';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatbotThreadsApiService {
  readonly #httpClient = inject(HttpClient);

  getThreadHistory(
    partnerId: number,
    threadId: string,
    query: ChatbotThreadHistoryQuery = {},
  ): Observable<HttpResponse<ChatbotThreadHistoryDTO>> {
    const url = `${this.#getThreadsUrl(partnerId)}/${threadId}/history`;
    const params: HttpParams = this.#buildPaginationParams(query);
    return this.#httpClient.get<ChatbotThreadHistoryDTO>(url, { observe: 'response', params });
  }

  getThreads(partnerId: number, query: ChatbotThreadsQuery = {}): Observable<HttpResponse<ChatbotThreadListDTO>> {
    const url = this.#getThreadsUrl(partnerId);
    const params: HttpParams = this.#buildPaginationParams(query);
    return this.#httpClient.get<ChatbotThreadListDTO>(url, { observe: 'response', params });
  }

  markThreadSeen(partnerId: number, threadId: string): Observable<HttpResponse<void>> {
    const url = `${this.#getThreadsUrl(partnerId)}/${threadId}/seen`;
    return this.#httpClient.post<void>(url, null, { observe: 'response' });
  }

  searchThreads(partnerId: number, query: ChatbotThreadSearchQuery): Observable<HttpResponse<ChatbotThreadListDTO>> {
    const url = `${this.#getThreadsUrl(partnerId)}/search`;
    let params: HttpParams = new HttpParams().set('q', query.q);
    if (query.cursor !== undefined) {
      params = params.set('cursor', query.cursor);
    }
    if (query.limit !== undefined) {
      params = params.set('limit', query.limit);
    }
    return this.#httpClient.get<ChatbotThreadListDTO>(url, { observe: 'response', params });
  }

  updateThreadTitle(partnerId: number, threadId: string, title: string): Observable<HttpResponse<ChatbotThreadDTO>> {
    const url = `${this.#getThreadsUrl(partnerId)}/${threadId}/title`;
    const payload: ChatbotThreadUpdateTitlePayload = { title };
    return this.#httpClient.patch<ChatbotThreadDTO>(url, payload, { observe: 'response' });
  }

  #buildPaginationParams(query: ChatbotThreadsQuery | ChatbotThreadHistoryQuery): HttpParams {
    let params: HttpParams = new HttpParams();
    if (query.cursor !== undefined) {
      params = params.set('cursor', query.cursor);
    }
    if (query.limit !== undefined) {
      params = params.set('limit', query.limit);
    }
    return params;
  }

  #getThreadsUrl(partnerId: number): string {
    return `${environment.agentsBaseUrl}/fz-assistant/partner/${partnerId}/chatbot/threads`;
  }
}
