import { inject, Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { TicketTimeGranularity } from '@fz-original/app/shared/models/order/ticket-time-granularity.enum';

import { AdapterInterface } from '../../../core/adapter.interface';
import { ChannelOverrideAdapter } from './channel-override.adapter';
import { PartnerShareAdapter } from './partner-share.adapter';
import {
  AddOnCategory,
  AddOnConfiguration,
  AddOnPartnerVisibility,
  AddOnPricingType,
  AddOnViewConfigurationType,
  AllowedNumTickets,
  GetSessionTypesInventoryDTO,
  InventoryAddOnConfigurationDTO,
  InventorySessionTypeChannelDTO,
  InventorySessionTypeDTO,
  InventorySessionTypeGroupDTO,
  InventorySessionTypeRulesDTO,
  InventorySessionTypeTagFromApi,
  NeededSessionType,
  SessionType,
  SessionTypeChannel,
  SessionTypeDisplayStep,
  SessionTypeEntitlement,
  SessionTypeEntitlementDTO,
  SessionTypeGroup,
  SessionTypeInventory,
  SessionTypeRule,
  SessionTypeRuleNeededSessionTypeDTO,
  SessionTypeSelectionRule,
  SessionTypeTag,
} from './session-type.model';

@Injectable({
  providedIn: 'root',
})
export class SessionTypeInventoryAdapter
  implements AdapterInterface<SessionTypeInventory | null, BaseResponse<GetSessionTypesInventoryDTO>>
{
  readonly #channelOverrideAdapter = inject(ChannelOverrideAdapter);
  readonly #partnerShareAdapter = inject(PartnerShareAdapter);

  fromApi(body: BaseResponse<GetSessionTypesInventoryDTO>): SessionTypeInventory | null {
    if (body.error !== null) {
      throw this.#getError(body.error);
    }
    return this.#getData(body.data);
  }

  #getData(data: GetSessionTypesInventoryDTO | null): SessionTypeInventory | null {
    if (data === null) {
      return null;
    }

    const allSessionTypeDTOs: InventorySessionTypeDTO[] = [
      ...data.session_type_groups.flatMap(g => g.session_types),
      ...data.ungrouped_session_types,
    ];
    const sessionTypeLabelById = new Map<number, string>(allSessionTypeDTOs.map(st => [st.id, st.label]));

    const sessionTypeGroups: SessionTypeGroup[] = [];
    const sessionTypes: SessionType[] = [];

    data.session_type_groups.forEach((groupBody: InventorySessionTypeGroupDTO) => {
      const sessionTypeGroup: SessionTypeGroup = {
        id: groupBody.id,
        name: groupBody.name,
        defaultCapacity: groupBody.default_capacity,
        codePoolFrequency: groupBody.code_pool_frequency,
        imageGeneratorType: groupBody.image_generator_type,
        isAssetBased: groupBody.is_asset_based,
        assetActivityId: groupBody.asset_activity_id ?? null,
        assetActivityPackId: groupBody.asset_activity_pack_id ?? null,
      };
      sessionTypeGroups.push(sessionTypeGroup);

      groupBody.session_types.forEach((sessionTypeBody: InventorySessionTypeDTO) => {
        const sessionType: SessionType = this.#mapSessionTypeFromInventoryDto(sessionTypeBody, sessionTypeGroup, sessionTypeLabelById);
        sessionTypes.push(sessionType);
      });
    });

    data.ungrouped_session_types.forEach((sessionTypeBody: InventorySessionTypeDTO) => {
      const sessionType: SessionType = this.#mapSessionTypeFromInventoryDto(sessionTypeBody, null, sessionTypeLabelById);
      sessionTypes.push(sessionType);
    });

    return {
      sessionTypeGroups,
      sessionTypes,
      totalArchived: data.total_archived ?? 0,
      defaultBookingTimeGranularity: this.#mapBookingTimeGranularity(data.default_booking_time_granularity),
    };
  }

  #mapBookingTimeGranularity(value: string | null): TicketTimeGranularity | null {
    switch (value) {
      case TicketTimeGranularity.ANYTIME:
      case TicketTimeGranularity.DATE:
      case TicketTimeGranularity.DATE_AND_TIME:
        return value;
      default:
        return null;
    }
  }

  #mapSessionTypeFromInventoryDto(
    sessionTypeBody: InventorySessionTypeDTO,
    group: SessionTypeGroup | null,
    sessionTypeLabelById: Map<number, string>,
  ): SessionType {
    const addOnConfiguration = this.#mapAddOnConfiguration(sessionTypeBody.add_on_configuration);
    const rule = this.#mapSessionTypeRule(sessionTypeBody.rules, sessionTypeLabelById);
    const sessionTypeChannels = this.#mapSessionTypeChannels(sessionTypeBody.channels, sessionTypeBody.id);
    const entitlements = this.#mapEntitlements(sessionTypeBody.entitlements);
    const sorting = this.#mapSorting(sessionTypeBody.sorting);

    return {
      id: sessionTypeBody.id,
      label: sessionTypeBody.label,
      details: sessionTypeBody.details,
      instructions: sessionTypeBody.instructions,
      allowedNumTickets: this.#getAllowedNumTickets(sessionTypeBody.allowed_num_tickets_min, sessionTypeBody.allowed_num_tickets_max),
      isAddOn: !!sessionTypeBody.add_on_configuration,
      useForAvailability: !sessionTypeBody.ignore_time_slot_capacity,
      groups: group === null ? [] : [group],
      productType: sessionTypeBody.product_type,
      tags: this.#mapInventoryTags(sessionTypeBody.tags),
      addOnConfiguration,
      rule,
      sessionTypeChannels,
      isShopProduct: sessionTypeBody.is_shop_product,
      sorting,
      ignoreTimeSlotCapacity: sessionTypeBody.ignore_time_slot_capacity,
      basePrice: sessionTypeBody.base_price,
      targetAttendee: sessionTypeBody.target_attendee ?? null,
      bookingTimeGranularity: this.#mapBookingTimeGranularity(sessionTypeBody.booking_time_granularity),
      ticketSelectorStepQuantity: sessionTypeBody.ticket_selector_step_quantity ?? null,
      ticketTier: sessionTypeBody.ticket_tier ?? null,
      packedSessionTypes: sessionTypeBody.packed_session_types ?? null,
      hasSessions: sessionTypeBody.has_sessions,
      entitlements,
      imageUrl: sessionTypeBody.image_url ?? null,
      published: sessionTypeBody.published,
      borrowedFromCatalogMainPlan: sessionTypeBody.borrowed_from_catalog_main_plan,
      archivedAt: sessionTypeBody.archived_at ?? null,
      channelOverrides: this.#channelOverrideAdapter.fromApi(sessionTypeBody.channel_overrides ?? []),
    };
  }

  #mapSorting(sorting: InventorySessionTypeDTO['sorting']): SessionType['sorting'] {
    return sorting ?? undefined;
  }

  #mapEntitlements(entitlements: SessionTypeEntitlementDTO[] | undefined): SessionTypeEntitlement[] {
    if (!entitlements) {
      return [];
    }
    return entitlements.map(entitlement => ({
      entitlementConfigurationId: entitlement.entitlement_configuration_id,
      entitlementConfigurationName: entitlement.entitlement_configuration_name,
      entitlementConfigurationType: entitlement.entitlement_configuration_type,
    }));
  }

  /**
   * Normalizes inventory tag payloads to {@link SessionTypeTag}.
   * Ideally the backend would return a single tag shape on all session-type endpoints.
   */
  #mapInventoryTags(raw: InventorySessionTypeDTO['tags'] | null | undefined): SessionTypeTag[] {
    if (raw == null || raw.length === 0) {
      return [];
    }
    return raw.map((item: InventorySessionTypeTagFromApi) => {
      if (typeof item === 'string') {
        return { label: item };
      }
      return { id: item.id, label: item.label };
    });
  }

  #mapAddOnConfiguration(addOnConfigurationBody: InventoryAddOnConfigurationDTO | null): AddOnConfiguration | null {
    if (!addOnConfigurationBody) {
      return null;
    }

    const partnerSharePercentage = this.#partnerShareAdapter.fromApi(addOnConfigurationBody.partner_share_percentage);
    return {
      category: this.#mapAddOnCategory(addOnConfigurationBody.category),
      selectorType: this.#mapAddOnSelectorType(addOnConfigurationBody.selector_type),
      displayStep: this.#mapAddOnDisplayStep(addOnConfigurationBody.display_step),
      pricingType: this.#mapAddOnPricingType(addOnConfigurationBody.pricing_type),
      isSelectedByDefault: addOnConfigurationBody.is_selected_by_default,
      partnerVisibility: this.#mapPartnerVisibility(addOnConfigurationBody.partner_visibility),
      ...(partnerSharePercentage !== null ? { partnerSharePercentage } : {}),
    };
  }

  #mapAddOnCategory(category: string): AddOnCategory {
    switch (category) {
      case 'regular':
        return AddOnCategory.regular;
      case 'premium_refund_policy':
        return AddOnCategory.premiumRefundPolicy;
      case 'transaction_fee':
        return AddOnCategory.transactionFee;
      case 'cancellation_insurance':
        return AddOnCategory.cancellationInsurance;
      default:
        return AddOnCategory.regular;
    }
  }

  #mapAddOnSelectorType(type: string): AddOnViewConfigurationType {
    switch (type) {
      case 'toggle':
        return AddOnViewConfigurationType.toggle;
      case 'stepper':
        return AddOnViewConfigurationType.stepper;
      default:
        return AddOnViewConfigurationType.toggle;
    }
  }

  #mapAddOnDisplayStep(step: string): SessionTypeDisplayStep {
    switch (step) {
      case 'ticket_selector':
        return SessionTypeDisplayStep.TicketSelector;
      case 'plan_view_cta_sheet':
        return SessionTypeDisplayStep.PlanViewCTASheet;
      case 'hidden':
        return SessionTypeDisplayStep.Hidden;
      case 'checkout':
        return SessionTypeDisplayStep.Checkout;
      default:
        return SessionTypeDisplayStep.TicketSelector;
    }
  }

  #mapPartnerVisibility(visibility: string | undefined): AddOnPartnerVisibility | null {
    switch (visibility) {
      case 'fever_only':
        return AddOnPartnerVisibility.feverOnly;
      case 'fever_and_partners':
        return AddOnPartnerVisibility.feverAndPartners;
      default:
        return null;
    }
  }

  #mapAddOnPricingType(type: string): AddOnPricingType {
    switch (type) {
      case 'fixed_amount':
        return AddOnPricingType.fixedAmount;
      case 'percentage_over_base_price':
        return AddOnPricingType.percentageOverBasePrice;
      case 'fixed_amount_defined_by_server':
        return AddOnPricingType.fixedAmountDefinedByServer;
      default:
        return AddOnPricingType.fixedAmount;
    }
  }

  #mapSessionTypeRule(rule: InventorySessionTypeRulesDTO | null, sessionTypeLabelById: Map<number, string>): SessionTypeRule | null {
    if (!rule) {
      return null;
    }

    return {
      selectionRule: this.#mapSelectionRule(rule.selection_rule),
      neededSessionTypes: this.#mapNeededSessionTypes(rule.needed_session_types, sessionTypeLabelById),
      visibleOnlyWhenNeededSessionTypesSelected: rule.visible_only_when_needed_session_types_selected,
    };
  }

  #mapSelectionRule(rule: string): SessionTypeSelectionRule {
    switch (rule) {
      case 'required':
        return SessionTypeSelectionRule.required;
      case 'standalone':
        return SessionTypeSelectionRule.standalone;
      case 'needs_session_type':
        return SessionTypeSelectionRule.needsSessionType;
      default:
        return SessionTypeSelectionRule.standalone;
    }
  }

  #mapNeededSessionTypes(
    neededSessionTypesBody: SessionTypeRuleNeededSessionTypeDTO[] | null,
    sessionTypeLabelById: Map<number, string>,
  ): NeededSessionType[] | null {
    if (!neededSessionTypesBody) {
      return null;
    }

    return neededSessionTypesBody.map(neededSessionTypeBody => ({
      id: neededSessionTypeBody.session_type,
      label: sessionTypeLabelById.get(neededSessionTypeBody.session_type) ?? '',
      allowedNumTickets: {
        minimum: neededSessionTypeBody.min,
        maximum: neededSessionTypeBody.max,
      },
    }));
  }

  #mapSessionTypeChannels(channels: InventorySessionTypeChannelDTO[], sessionTypeId: number): SessionTypeChannel[] {
    const sessionTypeChannels: SessionTypeChannel[] = [];
    for (const channel of channels) {
      sessionTypeChannels.push({
        sessionTypeId: sessionTypeId,
        channelId: channel.channel_id,
        allowedNumTickets: this.#getAllowedNumTickets(channel.allowed_num_tickets_min, channel.allowed_num_tickets_max),
        channelName: channel.name,
        isReseller: channel.is_reseller,
      });
    }
    return sessionTypeChannels;
  }

  #getAllowedNumTickets(min: number | null, max: number | null): AllowedNumTickets | null {
    if (min === null || max === null) {
      return null;
    }
    return { minimum: min, maximum: max };
  }

  #getError(data: BaseErrorResponse): BaseErrorResponse | null {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}
