import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { clickGuide } from './events/click-guide.event';

export const footerMixpanelMappers = mixpanelMapper([
  {
    event: clickGuide,
    name: 'click_guide',
    properties: null,
  },
]);
