import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { PublishImmersiveLayoutData } from '../../utils/immersive-layout-publish-tracking.util';

export const publishImmersiveLayout = defineEvent<PublishImmersiveLayoutData>('immersive.plan.layout.publish');
