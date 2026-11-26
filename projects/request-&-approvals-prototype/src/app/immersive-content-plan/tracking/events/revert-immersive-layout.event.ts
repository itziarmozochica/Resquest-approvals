import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { RevertImmersiveLayoutData } from '../../utils/immersive-layout-publish-tracking.util';

export const revertImmersiveLayout = defineEvent<RevertImmersiveLayoutData>('immersive.plan.layout.revert-to-draft');
