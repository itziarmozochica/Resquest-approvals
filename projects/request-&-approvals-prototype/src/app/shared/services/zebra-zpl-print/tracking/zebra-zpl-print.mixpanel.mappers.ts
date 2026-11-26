import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { zebraPrinter } from './events/zebra-printer.event';

export const zebraZplPrintMixpanelMappers = mixpanelMapper([
  {
    event: zebraPrinter,
    name: 'zebra_printer',
    properties: ({ orderId, planName, ...rest }) => ({
      order_id: orderId,
      plan_name: planName,
      ...rest, // the legacy wire kept errorMessage, errorMessageTranslate, printer, afterRetry and zpl as they are
    }),
  },
]);
