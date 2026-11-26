import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { saveDynamicFieldsRefused } from './events/save-dynamic-fields-refused.event';
import { saveDynamicFields } from './events/save-dynamic-fields.event';

const DYNAMIC_FIELDS_ERROR_SCOPE = 'dynamic_fields';
const BUSINESS_REJECTION_FAILURE = 'rejected';
const SERVER_FAILURE = 'server';

export const dynamicFieldsMixpanelMappers = mixpanelMapper([
  {
    event: saveDynamicFields,
    name: 'save_dynamic_fields',
    properties: ({ fieldNames, planId, ...rest }) => ({
      field_names: fieldNames,
      plan_id: planId,
      ...rest,
    }),
  },
  {
    event: saveDynamicFieldsRefused,
    name: 'error',
    properties: ({ planId, status, ...rest }) => ({
      plan_id: planId,
      reason: String(status),
      scope: DYNAMIC_FIELDS_ERROR_SCOPE,
      type: status === 0 || status >= 500 ? SERVER_FAILURE : BUSINESS_REJECTION_FAILURE,
      ...rest,
    }),
  },
]);
