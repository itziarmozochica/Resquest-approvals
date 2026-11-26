import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { publishImmersiveLayout } from './events/publish-immersive-layout.event';
import { revertImmersiveLayout } from './events/revert-immersive-layout.event';

export const immersiveContentPlanMixpanelMappers = mixpanelMapper([
  {
    event: publishImmersiveLayout,
    name: 'FZ|Immersive|Layout_Publish',
    properties: ({ changeCount, changeKinds, changes, planId, ...rest }) => ({
      change_count: changeCount,
      change_kinds: changeKinds,
      changes: changes.map(({ fieldPath, moduleId, ...change }) => ({
        ...change,
        ...(fieldPath === undefined ? {} : { field_path: fieldPath }),
        ...(moduleId === undefined ? {} : { module_id: moduleId }),
      })),
      plan_id: planId,
      ...rest,
    }),
  },
  {
    event: revertImmersiveLayout,
    name: 'FZ|Immersive|Layout_Revert_To_Draft',
    properties: ({ planId }) => ({ plan_id: planId }),
  },
]);
