import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { createCashRegister } from './events/create-cash-register.event';

export const settingsMixpanelMappers = mixpanelMapper([
  {
    event: createCashRegister,
    name: 'create_cash_register',
    properties: ({ cashRegisterId, placeId }) => ({
      cash_register_id: cashRegisterId,
      place_id: placeId,
    }),
  },
]);
