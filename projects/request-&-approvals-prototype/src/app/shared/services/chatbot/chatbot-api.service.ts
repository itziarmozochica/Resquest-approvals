import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ChatbotActionResultsRequestDTO,
  ChatbotActionResultsResponseDTO,
  ChatbotChartConfigDTO,
  ChatbotDatasetPreview,
  ChatbotInitResponseDTO,
  ChatbotPromptVersionsDTO,
  ChatbotRequest,
  ChatbotRunOutputDTO,
  ChatbotSubmitFeedbackPayload,
} from '../../models/chatbot/chatbot.model';

@Injectable({
  providedIn: 'root',
})
export class ChatbotApiService {
  #httpClient = inject(HttpClient);

  getAssetDownloadUrl(partnerId: number, assetId: string): Observable<string> {
    const url = `${this.#getDatasetUrl(partnerId, assetId)}/download`;
    return this.#httpClient.get<{ url: string }>(url).pipe(map((body: { url: string }) => body.url));
  }

  getChartConfig(partnerId: number, assetId: string): Observable<HttpResponse<ChatbotChartConfigDTO>> {
    const url = this.#getChartUrl(partnerId, assetId);
    return this.#httpClient.get<ChatbotChartConfigDTO>(url, { observe: 'response' });
  }

  getDatasetPreview(partnerId: number, assetId: string): Observable<ChatbotDatasetPreview> {
    const url = `${this.#getDatasetUrl(partnerId, assetId)}/preview`;
    return this.#httpClient.get<ChatbotDatasetPreview>(url);
  }

  getPromptVersions(partnerId: number): Observable<ChatbotPromptVersionsDTO> {
    const url = `${this.#getChatbotUrl(partnerId)}/prompt-versions`;
    return this.#httpClient.get<ChatbotPromptVersionsDTO>(url);
  }

  getRunStatus(partnerId: number, runId: string): Observable<HttpResponse<ChatbotRunOutputDTO>> {
    const url = `${this.#getChatbotUrl(partnerId)}/chat/${runId}`;
    return this.#httpClient.get<ChatbotRunOutputDTO>(url, { observe: 'response' });
  }

  initChat(partnerId: number, payload: ChatbotRequest, timeoutMs: number): Observable<HttpResponse<ChatbotInitResponseDTO>> {
    const url = `${this.#getChatbotUrl(partnerId)}/chat`;
    let headers: HttpHeaders = new HttpHeaders().set('timeout', `${timeoutMs}`);
    const timezone: string | null = this.#getBrowserTimezone();

    if (timezone) {
      headers = headers.set('X-Timezone', timezone);
    }

    return this.#httpClient.post<ChatbotInitResponseDTO>(url, payload, { headers, observe: 'response' });
  }

  postActionResults(
    partnerId: number,
    payload: ChatbotActionResultsRequestDTO,
    timeoutMs: number,
  ): Observable<ChatbotActionResultsResponseDTO> {
    const url = `${this.#getChatbotUrl(partnerId)}/action-results`;
    const headers: HttpHeaders = new HttpHeaders().set('timeout', `${timeoutMs}`);
    return this.#httpClient.post<ChatbotActionResultsResponseDTO>(url, payload, { headers });
  }

  submitFeedback(partnerId: number, payload: ChatbotSubmitFeedbackPayload): Observable<void> {
    const url = `${this.#getChatbotUrl(partnerId)}/feedback`;
    return this.#httpClient.post<void>(url, payload);
  }

  #getBrowserTimezone(): string | null {
    try {
      const timezone: string | undefined = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();

      if (!timezone) {
        return null;
      }

      Intl.DateTimeFormat(undefined, { timeZone: timezone });

      return timezone;
    } catch {
      return null;
    }
  }

  #getChartUrl(partnerId: number, assetId: string): string {
    return `${environment.agentsBaseUrl}/fz-assistant/partner/${partnerId}/assets/${assetId}/chart`;
  }

  #getChatbotUrl(partnerId: number): string {
    return `${environment.agentsBaseUrl}/fz-assistant/partner/${partnerId}/chatbot`;
  }

  #getDatasetUrl(partnerId: number, assetId: string): string {
    return `${environment.agentsBaseUrl}/fz-assistant/partner/${partnerId}/assets/${assetId}/dataset`;
  }
}
