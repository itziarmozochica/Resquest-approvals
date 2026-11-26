import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';

import { PARTNER_TAGS_FEATURE } from './partner-tags.optimizely-feature';
import { SESSION_TYPE_COLORS_FEATURE } from './session-type-colors.optimizely-feature';

// The stripe shows a tag's colour, so it also needs `partner_tags`: a partner who cannot see its tags must not see their
// colours. `null` while the SDK cannot answer yet, so a caller can ask again instead of freezing the answer.
export function sessionTypeColorsAnswer(optimizely: OptimizelyService): boolean | null {
  const hasSessionTypeColors = optimizely.isFeatureEnabled(SESSION_TYPE_COLORS_FEATURE);
  const hasPartnerTags = optimizely.isFeatureEnabled(PARTNER_TAGS_FEATURE);

  if (hasSessionTypeColors === false || hasPartnerTags === false) {
    return false;
  }

  return hasSessionTypeColors === true && hasPartnerTags === true ? true : null;
}
