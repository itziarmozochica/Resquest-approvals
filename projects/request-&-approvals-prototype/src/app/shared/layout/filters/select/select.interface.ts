import { PlanKind } from '../../../models/plan/plan-kind.enum';
import { PlanStatus } from '../../../models/plan/plan-status.enum';

export interface SelectOption {
  /**
   * @todo and id prop as any is totally unacceptable.
   * Provide string or number or both, but never `any`.
   */
  id: any;
  title: string;
  channelId?: string;
  description?: string;
  disabled?: boolean;
  disabledDescription?: string;
  hasDeclarativeInventory?: boolean;
  hasEditAction?: boolean;
  isActivityPack?: boolean;
  isAssetBased?: boolean;
  isGroupHeader?: boolean;
  isLoadingOption?: boolean;
  /** Draws the Fever-only marker after the title in the dropdown. */
  isPartnerRestricted?: boolean;
  kind?: PlanKind;
  lastSessionDate?: string;
  lastSessionDateRegardlessOfExpirationAndAttendance?: string;
  nextSessionDate?: string;
  nextSessionDateRegardlessOfAttendance?: string;
  setupId?: string;
  shortDescription?: string;
  status?: PlanStatus;
  /** Classes of a small colour square drawn before the title in the dropdown (a legend colour); the caller styles them. */
  swatchClass?: string;
  titleTranslated?: string;
}
