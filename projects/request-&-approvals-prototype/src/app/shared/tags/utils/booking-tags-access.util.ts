import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

import { PARTNER_TAGS_FEATURE } from './partner-tags.optimizely-feature';

export function canAccessBookingTags(optimizelyService: OptimizelyService, userService: UserService): boolean {
  return (
    (optimizelyService.isFeatureEnabled(PARTNER_TAGS_FEATURE) ?? false) && userService.hasPermission(Permissions.CAN_VIEW_TICKET_TYPES)
  );
}
