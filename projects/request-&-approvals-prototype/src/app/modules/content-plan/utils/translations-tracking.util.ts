import { TranslationsContextData } from '@fz-original/app/modules/content-plan/models/translations-tracking.model';
import { EditingPlanService } from '@fz-original/app/modules/content-plan/services/editing-plan/editing-plan.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';

export function buildTranslationsTrackingContext(
  partnerService: PartnerService,
  editingPlanService: EditingPlanService,
): TranslationsContextData | null {
  const partnerId = partnerService.getPartner()?.id;
  const planId = editingPlanService.getSelectedPlanDetail()?.data?.id;

  if (partnerId === undefined || planId === undefined || planId === null) {
    return null;
  }

  return { partnerId, planId };
}
