import { type Provider } from '@angular/core';

import { feverzoneContextFactory } from '@fz-original/app/core/factories/feverzone-context.factory';
import { provideTracking, withContext, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { customerServiceChatMixpanelMappers } from './customer-service-chat.mixpanel.mappers';

export const customerServiceChatTrackingProvider = (): Provider[] =>
  provideTracking(withContext(feverzoneContextFactory), withMixpanel(customerServiceChatMixpanelMappers));
