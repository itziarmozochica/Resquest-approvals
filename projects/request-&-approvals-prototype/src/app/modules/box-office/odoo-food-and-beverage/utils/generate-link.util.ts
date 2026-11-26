import { HttpParams } from '@angular/common/http';

import { environment } from '@fz-original/environments/environment';

export function generateLinkUrl(partnerId: number, path: string): string {
  return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/${path}`;
}

export function generateLinkChannelParams(channelId: string): HttpParams {
  return new HttpParams().set('channel_id', channelId);
}
