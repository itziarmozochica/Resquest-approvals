import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import {
  AmbassadorTrackingLink,
  AmbassadorTrackingLinkData,
  AmbassadorTrackingLinkResponse,
} from '../models/ambassador-tracking-link.model';

@Injectable({
  providedIn: 'root',
})
export class AmbassadorTrackingLinkAdapter implements AdapterInterface<AmbassadorTrackingLink[] | null> {
  fromApi(response: HttpResponse<BaseResponse<AmbassadorTrackingLinkResponse>>): AmbassadorTrackingLink[] | null {
    const body = response.body;
    const trackingLinks = body?.data?.tracking_links;

    if (!trackingLinks) {
      return null;
    }

    return this.#getData(trackingLinks);
  }

  #getData(data: AmbassadorTrackingLinkData[]): AmbassadorTrackingLink[] {
    return data.map(item => ({
      applicationId: item.application_id,
      applicationName: item.application_name,
      trackingLink: item.tracking_link,
    }));
  }
}
