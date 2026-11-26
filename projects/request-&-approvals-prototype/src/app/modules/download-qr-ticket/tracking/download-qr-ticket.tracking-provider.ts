import { type Provider } from '@angular/core';

import { feverzoneContextFactory } from '@fz-original/app/core/factories/feverzone-context.factory';
import { provideTracking, withContext, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { downloadQrTicketMixpanelMappers } from './download-qr-ticket.mixpanel.mappers';

export const downloadQrTicketTrackingProvider = (): Provider[] =>
  provideTracking(withContext(feverzoneContextFactory), withMixpanel(downloadQrTicketMixpanelMappers));
