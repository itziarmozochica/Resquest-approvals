import { inject, Injectable } from '@angular/core';

import { ChannelOverrideAdapter } from '@fz-original/app/shared/services/sessions/channel-override.adapter';
import { PartnerShareAdapter } from '@fz-original/app/shared/services/sessions/partner-share.adapter';
import { PartnerVisibilityAdapter } from '@fz-original/app/shared/services/sessions/partner-visibility.adapter';
import {
  AddOnCategory,
  AddOnPartnerVisibility,
  AddOnPricingType,
  AddOnViewConfigurationType,
  InventoryAddOnConfigurationDTO,
  InventorySessionTypeRulesDTO,
  SessionTypeCategory,
  SessionTypeDisplayStep,
  SessionTypeEntitlement,
  SessionTypeEntitlementDTO,
  SessionTypeFormValue,
  SessionTypeSelectionRule,
  UpdateSessionTypeChannelDTO,
  UpdateSessionTypeDTO,
} from '@fz-original/app/shared/services/sessions/session-type.model';

@Injectable({
  providedIn: 'root',
})
export class UpdateSessionTypeAdapter {
  readonly #channelOverrideAdapter = inject(ChannelOverrideAdapter);
  readonly #partnerShareAdapter = inject(PartnerShareAdapter);
  readonly #partnerVisibilityAdapter = inject(PartnerVisibilityAdapter);

  toApi(sessionType: SessionTypeFormValue): UpdateSessionTypeDTO {
    const dto: UpdateSessionTypeDTO = {
      label: sessionType.label,
      product_type: sessionType.productTypeId,
      group_id: sessionType.groupId,
      details: sessionType.categoryId === SessionTypeCategory.cancellationInsurance ? '' : sessionType.details,
      instructions: sessionType.instructions,
      allowed_num_tickets: sessionType.allowedNumTickets,
      target_attendee: sessionType.targetAttendeeId,
      booking_time_granularity: sessionType.bookingTimeGranularityId,
      ticket_selector_step_quantity: sessionType.ticketSelectorStepQuantity,
      ticket_tier: sessionType.ticketTier,
      add_on_configuration: sessionType.addOnConfiguration !== undefined ? this.#mapAddOnConfiguration(sessionType) : undefined,
      rules: sessionType.rule !== undefined ? this.#mapRules(sessionType) : undefined,
      session_type_channels: sessionType.sessionTypeChannels?.map(
        (stc): UpdateSessionTypeChannelDTO => ({
          channel_id: stc.channelId,
          allowed_num_tickets: stc.allowedNumTickets ?? null,
        }),
      ),
      channel_overrides:
        sessionType.channelOverrides !== undefined ? this.#channelOverrideAdapter.toApi(sessionType.channelOverrides) : undefined,
      entitlements: sessionType.entitlements !== undefined ? this.#mapEntitlements(sessionType.entitlements) : undefined,
      image_url: sessionType.imageUrl,
    };
    return Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined)) as UpdateSessionTypeDTO;
  }

  #mapEntitlements(entitlements: SessionTypeEntitlement[]): SessionTypeEntitlementDTO[] {
    return entitlements.map(entitlement => ({
      entitlement_configuration_id: entitlement.entitlementConfigurationId,
      entitlement_configuration_name: entitlement.entitlementConfigurationName,
    }));
  }

  #mapAddOnConfiguration(sessionType: SessionTypeFormValue): InventoryAddOnConfigurationDTO | null {
    const categoryId = sessionType.categoryId as SessionTypeCategory | undefined;
    if (
      categoryId !== SessionTypeCategory.addOn &&
      categoryId !== SessionTypeCategory.premiumRefundPolicy &&
      categoryId !== SessionTypeCategory.transactionFee &&
      categoryId !== SessionTypeCategory.cancellationInsurance
    ) {
      return null;
    }

    if (categoryId === SessionTypeCategory.cancellationInsurance) {
      return this.#mapCancellationInsuranceAddOnConfiguration(sessionType);
    }

    const addOn = sessionType.addOnConfiguration;
    const partnerVisibility = this.#partnerVisibilityAdapter.toApi(categoryId, addOn?.partnerVisibility);
    return {
      category: this.#mapAddOnCategory(categoryId),
      selector_type: this.#mapSelectorType(addOn?.selectorType?.id as AddOnViewConfigurationType),
      display_step: this.#mapDisplayStep(addOn?.displayStep?.id as SessionTypeDisplayStep),
      pricing_type: this.#mapPricingType(addOn?.pricingType?.id as AddOnPricingType),
      is_selected_by_default: addOn?.isSelectedByDefault ?? false,
      ...(partnerVisibility !== null ? { partner_visibility: partnerVisibility } : {}),
      ...(partnerVisibility === AddOnPartnerVisibility.feverOnly ? { is_affected_by_coupon_discount: false } : {}),
    };
  }

  #mapCancellationInsuranceAddOnConfiguration(sessionType: SessionTypeFormValue): InventoryAddOnConfigurationDTO {
    const partnerVisibility = this.#partnerVisibilityAdapter.toApi(
      SessionTypeCategory.cancellationInsurance,
      sessionType.addOnConfiguration?.partnerVisibility,
    );
    const partnerShare = this.#partnerShareAdapter.toApi(sessionType.addOnConfiguration?.partnerSharePercentage);
    return {
      category: this.#mapAddOnCategory(SessionTypeCategory.cancellationInsurance),
      selector_type: this.#mapSelectorType(AddOnViewConfigurationType.toggle),
      display_step: this.#mapDisplayStep(SessionTypeDisplayStep.Checkout),
      pricing_type: this.#mapPricingType(AddOnPricingType.fixedAmountDefinedByServer),
      is_selected_by_default: sessionType.addOnConfiguration?.isSelectedByDefault ?? false,
      is_affected_by_coupon_discount: false,
      ...(partnerVisibility !== null ? { partner_visibility: partnerVisibility } : {}),
      ...(partnerShare !== null ? { partner_share_percentage: partnerShare } : {}),
    };
  }

  #mapAddOnCategory(categoryId: SessionTypeCategory): AddOnCategory {
    switch (categoryId) {
      case SessionTypeCategory.premiumRefundPolicy:
        return AddOnCategory.premiumRefundPolicy;
      case SessionTypeCategory.transactionFee:
        return AddOnCategory.transactionFee;
      case SessionTypeCategory.cancellationInsurance:
        return AddOnCategory.cancellationInsurance;
      default:
        return AddOnCategory.regular;
    }
  }

  #mapRules(sessionType: SessionTypeFormValue): InventorySessionTypeRulesDTO | null {
    const rule = sessionType.rule;
    if (!rule?.selectionRule?.id) {
      return null;
    }

    const selectionRule = this.#mapSelectionRule(rule.selectionRule.id as SessionTypeSelectionRule);
    return {
      selection_rule: selectionRule,
      needed_session_types:
        selectionRule === SessionTypeSelectionRule.needsSessionType
          ? (rule.neededSessionTypes?.map(opt => ({
              session_type: Number(opt.id),
              min: 1,
              max: 14,
            })) ?? null)
          : null,
      visible_only_when_needed_session_types_selected: rule.visibleOnlyWhenNeededSessionTypesSelected ?? false,
    };
  }

  #mapSelectorType(type: AddOnViewConfigurationType): string {
    switch (type) {
      case AddOnViewConfigurationType.toggle:
        return 'toggle';
      case AddOnViewConfigurationType.stepper:
        return 'stepper';
      default:
        return 'toggle';
    }
  }

  #mapDisplayStep(step: SessionTypeDisplayStep): string {
    switch (step) {
      case SessionTypeDisplayStep.TicketSelector:
        return 'ticket_selector';
      case SessionTypeDisplayStep.PlanViewCTASheet:
        return 'plan_view_cta_sheet';
      case SessionTypeDisplayStep.Hidden:
        return 'hidden';
      case SessionTypeDisplayStep.Checkout:
        return 'checkout';
      default:
        return 'ticket_selector';
    }
  }

  #mapPricingType(type: AddOnPricingType): string {
    switch (type) {
      case AddOnPricingType.fixedAmount:
        return 'fixed_amount';
      case AddOnPricingType.percentageOverBasePrice:
        return 'percentage_over_base_price';
      case AddOnPricingType.fixedAmountDefinedByServer:
        return 'fixed_amount_defined_by_server';
      default:
        return 'fixed_amount';
    }
  }

  #mapSelectionRule(rule: SessionTypeSelectionRule): string {
    switch (rule) {
      case SessionTypeSelectionRule.standalone:
        return 'standalone';
      case SessionTypeSelectionRule.required:
        return 'required';
      case SessionTypeSelectionRule.needsSessionType:
        return 'needs_session_type';
      default:
        return 'standalone';
    }
  }
}
