import { Params } from '@angular/router';

import { isString } from '@fz-original/app/app/utils/ts/ts.util';

import { DownloadQrTicketLink } from '../models/download-qr-ticket.model';

export function parseDownloadQrTicketLink(queryParams: Params): DownloadQrTicketLink {
  const partnerId = Number(queryParams.partnerId);
  return {
    data: isString(queryParams.data) ? queryParams.data : '',
    onsiteSetupId: isString(queryParams.onsiteSetupId) && queryParams.onsiteSetupId.length > 0 ? queryParams.onsiteSetupId : null,
    partnerId: isString(queryParams.partnerId) && queryParams.partnerId.length > 0 && !isNaN(partnerId) ? partnerId : null,
  };
}
