import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { ChannelType } from '@fz-original/app/shared/models/channel/channel-type.enum';
import { ChannelData, ChannelsData, ChannelsDataWithPermissions } from '@fz-original/app/shared/services/channel/channel.model';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { SelectOption } from '../../layout/filters/select/select.interface';
import { BaseResponse, IBaseResponse } from '../../models/base-response';
import { Channel, ChannelWithUserPermissions } from '../../models/channel/channel.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { ChannelsWithPermissionsAdapter } from './channels-with-permissions.adapter';
import { ChannelsAdapter } from './channels.adapter';

@Injectable({
  providedIn: 'root',
})
export class ChannelsService {
  channels: Observable<BaseResponse<Channel[] | null>> | null = null;
  private lastPartnerId: number | null = null;

  constructor(
    private httpClient: HttpClient,
    private channelsAdapter: ChannelsAdapter,
    private channelsWithPermissionsAdapter: ChannelsWithPermissionsAdapter,
  ) {}

  createCustomB2BChannel(partnerId: number, channel: Channel): Observable<BaseResponse<Channel | null>> {
    const path = this.#getCustomChannelBaseUrl(partnerId);

    return this.httpClient.post<BaseResponse<{ channel: ChannelData }>>(path, channel).pipe(
      map(result => {
        const channelData = result?.data?.channel;
        const channelMapped: Channel | null = channelData
          ? {
              id: String(channelData.id),
              name: channelData.name,
              type: channelData.type,
            }
          : null;
        return new BaseResponse<Channel | null>(channelMapped, result?.error || null);
      }),
      catchError(error => {
        const errorResponse = ErrorResponseUtils.getErrorResponseError(error);
        return of(new BaseResponse<Channel | null>(null, errorResponse));
      }),
    );
  }

  getBusinessChannelOptions(partnerId: number): Observable<Array<SelectOption>> {
    return this.getChannels(partnerId, true).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        const channels = response.data ?? [];
        return channels.map(channel => ({
          id: channel.id,
          title: channel.name || '',
        }));
      }),
    );
  }

  getBoxOfficeChannelOptions$(partnerId: number): Observable<Array<SelectOption>> {
    return this.getChannelsByTypes(partnerId, new Set([ChannelType.BoxOffice])).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }

        const channels = response.data ?? [];
        return channels.map(channel => ({
          id: channel.id,
          title: channel.name ?? channel.id,
        }));
      }),
    );
  }

  getChannels(partnerId: number, notIncludeResellersChannels = false): Observable<BaseResponse<Channel[] | null>> {
    if (notIncludeResellersChannels) {
      return this.getChannelsRequest({ channelTypes: new Set([ChannelType.B2bPortal]), notIncludeResellersChannels, partnerId }).pipe(
        catchError(error => {
          const errorResponse = ErrorResponseUtils.getErrorResponseError(error);
          return of(new BaseResponse<Channel[] | null>(null, errorResponse));
        }),
      );
    }
    if (this.lastPartnerId !== partnerId || this.channels === null) {
      this.lastPartnerId = partnerId;
      this.channels = this.getChannelsCacheableRequest(partnerId);
    }
    return this.channels;
  }

  getChannelsByTypes(partnerId: number, channelTypes: Set<ChannelType>): Observable<BaseResponse<Channel[] | null>> {
    return this.getChannelsRequest({ channelTypes, partnerId }).pipe(
      catchError(error => ErrorResponseUtils.getErrorResponse<Channel[]>(error)),
    );
  }

  getChannelsWithUserPermissions(partnerId: number): Observable<ChannelWithUserPermissions[]> {
    return this.getChannelsWithUserPermissionsRequest(partnerId).pipe(
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  #clearChannelsCache(partnerId: number): void {
    if (this.lastPartnerId !== partnerId) {
      return;
    }
    this.channels = null;
    this.lastPartnerId = null;
  }

  #getCustomChannelBaseUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/channels/`;
  }

  private getChannelsBaseUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/channels/`;
  }

  private getChannelsCacheableRequest(partnerId: number): Observable<BaseResponse<Channel[] | null>> {
    return this.getChannelsRequest({ partnerId }).pipe(
      catchError(error => ErrorResponseUtils.getErrorResponse<Channel[]>(error)),
      tap((response: BaseResponse<Channel[] | null>) => {
        if (response.error != null) {
          this.#clearChannelsCache(partnerId);
        }
      }),
      shareReplay(1),
    );
  }

  private getChannelsRequest({
    channelTypes,
    notIncludeResellersChannels,
    partnerId,
  }: {
    partnerId: number;
    channelTypes?: Set<ChannelType>;
    notIncludeResellersChannels?: boolean;
  }): Observable<BaseResponse<Channel[] | null>> {
    const path = this.getChannelsBaseUrl(partnerId);
    let params = new HttpParams();

    if (channelTypes && channelTypes.size > 0) {
      params = params.set('channel_types', Array.from(channelTypes).join(','));
    }

    if (notIncludeResellersChannels) {
      params = params.set('include_resellers_channels', 'false');
    }

    return this.httpClient.get<BaseResponse<ChannelsData>>(path, { params }).pipe(map(result => this.channelsAdapter.fromApi(result)));
  }

  private getChannelsWithUserPermissionsRequest(partnerId: number): Observable<ChannelWithUserPermissions[]> {
    const path = this.getChannelsWithUserPermissionsUrl(partnerId);
    return this.httpClient
      .get<IBaseResponse<ChannelsDataWithPermissions>>(path)
      .pipe(map(result => this.channelsWithPermissionsAdapter.fromApi(result)));
  }

  private getChannelsWithUserPermissionsUrl(partnerId: number): string {
    return `${this.getChannelsBaseUrl(partnerId)}?include_user_permissions=True`;
  }
}
