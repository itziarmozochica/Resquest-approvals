import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { WaitingRoomAdapter } from './waiting-room.adapter';
import type {
  CreateWaitingRoomInput,
  CreateWaitingRoomResponse,
  DeleteWaitingRoomResponse,
  UpdateOutflowRequest,
  UpdateOutflowResponseData,
  UpdateOutflowResult,
  WaitingRoomDetails,
  WaitingRoomDetailsResponse,
  WaitingRoomId,
  WaitingRoomIdResponse,
} from './waiting-room.service.types';

@Injectable({
  providedIn: 'root',
})
export class WaitingRoomService {
  #http = inject(HttpClient);
  #adapter = inject(WaitingRoomAdapter);
  #partnersBasePath = `${environment.apiBaseUrl}/3.0/partners/`;

  createWaitingRoom(partnerId: number, body: CreateWaitingRoomInput): Observable<CreateWaitingRoomResponse> {
    const path = `${this.#partnersBasePath}${partnerId}/waiting-rooms/`;

    const apiBody = this.#adapter.toCreateBody(body);

    return this.#http.post<BaseResponse<CreateWaitingRoomResponse>>(path, apiBody).pipe(
      map(() => ({})),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  deleteWaitingRoom(partnerId: number, waitingRoomId: string): Observable<DeleteWaitingRoomResponse> {
    const path = `${this.#partnersBasePath}${partnerId}/waiting-rooms/${waitingRoomId}/`;

    return this.#http.delete<DeleteWaitingRoomResponse>(path).pipe(
      map(() => ({})),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getWaitingRoomDetails(partnerId: number, waitingRoomId: string): Observable<WaitingRoomDetails> {
    const path = `${this.#partnersBasePath}${partnerId}/waiting-rooms/${waitingRoomId}/`;

    return this.#http.get<BaseResponse<WaitingRoomDetailsResponse>>(path).pipe(
      map(response => this.#adapter.fromApi(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getWaitingRoomId(partnerId: number, planId: number, channelId: string): Observable<WaitingRoomId | null> {
    const path = `${this.#partnersBasePath}${partnerId}/plans/${planId}/waiting-room-id/?channel_id=${channelId}`;

    return this.#http.get<BaseResponse<WaitingRoomIdResponse>>(path).pipe(
      map(response => ({
        waitingRoomId: response.data?.waiting_room_id ?? null,
      })),
      catchError(error => {
        if (error?.status === 404) {
          return of(null);
        }
        return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
      }),
    );
  }

  updateOutflow(partnerId: number, waitingRoomId: string, maxOutflow: number): Observable<UpdateOutflowResult> {
    const path = `${this.#partnersBasePath}${partnerId}/waiting-rooms/${waitingRoomId}/outflow/`;
    const body: UpdateOutflowRequest = { max_outflow: maxOutflow };

    return this.#http.put<BaseResponse<UpdateOutflowResponseData>>(path, body).pipe(
      map(response => {
        if (!response.data) throw new Error('No data received from update outflow API');
        return this.#adapter.fromUpdateOutflowResult(response.data);
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }
}
