import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import { PlanOption } from '../../../shared/search-bar/models/plan-option.model';
import { PlanCategory, PlanType } from '../models/general-section.enum';
import { MainPlanSettings } from '../models/main-plan-settings.model';
import { ResaleProvider } from '../models/resale-section.enum';
import { SelectorSettingType, SessionSelectorType } from '../models/selector-session-section.enum';
import {
  CancellationSettingsSectionConfig,
  ContractSectionConfig,
  DisallowIndexingSectionConfig,
  EventRedirectSectionConfig,
  ExternalPlatformsSectionConfig,
  GeneralSectionConfig,
  MainSettingsState,
  OtherSettingsState,
  OverrideCapacitySectionConfig,
  PostPurchaseSectionConfig,
  PricesSectionConfig,
  ResaleSectionConfig,
  SelectorSettingsSectionConfig,
  SettingsConfigs,
  TicketSettingsState,
  TransportSectionConfig,
  ValidationSectionConfig,
} from '../models/settings-configs.model';
import { ValidationMethod } from '../models/validation-section.enum';

export interface BuildSettingsConfigsOptions {
  cities?: SelectOption[];
  plans?: PlanOption[];
  redirectEnabled?: boolean;
  redirectSelectedCity?: SelectOption | null;
  redirectSelectedPlan?: PlanOption | null;
}

export function buildGeneralSectionConfig(state: MainSettingsState): GeneralSectionConfig {
  return {
    category: {
      allowed: state.allowedValues.categoryTypes as PlanCategory[],
      editable: state.permissions.canEditCategory,
      visible: state.hasFields.category,
    },
    cities: {
      allowed: undefined,
      editable: state.permissions.canEditCities,
      visible: state.hasFields.cities,
    },
    type: {
      allowed: state.allowedValues.planTypes as PlanType[],
      editable: state.permissions.canEditType,
      visible: state.hasFields.type,
    },
  };
}

export function buildValidationSectionConfig(state: MainSettingsState): ValidationSectionConfig {
  return {
    validationMethod: {
      allowed: state.allowedValues.validationMethods,
      editable: state.permissions.canEditValidationMethod,
      visible: state.hasFields.validationMethod,
    },
    validationWindow: {
      allowed: undefined,
      editable: state.permissions.canEditValidationWindow,
      visible: state.hasFields.validationWindow,
    },
  };
}

export function buildContractSectionConfig(state: MainSettingsState): ContractSectionConfig {
  return {
    contracts: {
      allowed: undefined,
      editable: state.permissions.canEditContracts,
      visible: state.hasFields.contracts,
    },
    partnershipType: {
      allowed: state.allowedValues.partnershipTypes,
      editable: state.permissions.canEditPartnershipType,
      visible: state.hasFields.partnershipType,
    },
  };
}

export function buildPricesSectionConfig(state: MainSettingsState): PricesSectionConfig {
  return {
    priceList: {
      allowed: undefined,
      editable: state.permissions.canEditPriceList,
      visible: state.hasFields.priceList,
    },
    taxCalculation: {
      allowed: undefined,
      editable: state.permissions.canEditTaxCalculation,
      visible: state.hasFields.taxCalculation,
    },
  };
}

export function buildSelectorSettingsSectionConfig(state: OtherSettingsState): SelectorSettingsSectionConfig {
  return {
    calendar: {
      allowed: undefined,
      editable: state.permissions.canEditCalendarSelector,
      visible: state.hasFields.calendarSelector,
    },
    continuousTime: {
      allowed: undefined,
      editable: state.permissions.canEditContinuousTimeSelector,
      visible: state.hasFields.continuousTimeSelector,
    },
    labelFormat: {
      allowed: undefined,
      editable: state.permissions.canEditLabelFormat,
      visible: state.hasFields.labelFormat,
    },
    session: {
      allowed: state.allowedValues.sessionSelectorTypes.length > 0 ? state.allowedValues.sessionSelectorTypes : undefined,
      editable: state.permissions.canEditSessionSelectorType,
      visible: state.hasFields.sessionSelectorType,
    },
    setting: {
      allowed: state.allowedValues.selectorSettingTypes.length > 0 ? state.allowedValues.selectorSettingTypes : undefined,
      editable: state.permissions.canEditSelectorSettingType,
      visible: state.hasFields.selectorSettingType,
    },
  };
}

export function buildExternalPlatformsSectionConfig(state: OtherSettingsState): ExternalPlatformsSectionConfig {
  return {
    allowPublishingInOta: {
      allowed: undefined,
      editable: state.permissions.canEditDenyPublishingInOta,
      visible: state.hasFields.denyPublishingInOta,
    },
  };
}

export function buildPostPurchaseSectionConfig(state: OtherSettingsState): PostPurchaseSectionConfig {
  return {
    requestGeneralReview: {
      allowed: undefined,
      editable: state.permissions.canEditRequestGeneralReview,
      visible: state.hasFields.postPurchaseReview,
    },
  };
}

export function buildDisallowIndexingSectionConfig(state: OtherSettingsState): DisallowIndexingSectionConfig {
  return {
    disallowIndexing: {
      allowed: undefined,
      editable: state.permissions.canEditDisallowIndexing,
      visible: state.hasFields.disallowIndexing,
    },
  };
}

export function buildEventRedirectSectionConfig(
  state: OtherSettingsState,
  options: BuildSettingsConfigsOptions,
): EventRedirectSectionConfig {
  return {
    cityOptions: options.cities ?? [],
    inputSelectedCity: options.redirectSelectedCity ?? null,
    inputSelectedPlan: options.redirectSelectedPlan ?? null,
    plans: options.plans ?? [],
    redirectEnabled: options.redirectEnabled ?? false,
    redirectToId: {
      allowed: undefined,
      editable: state.permissions.canEditRedirectToId,
      visible: state.hasFields.redirectToId,
    },
  };
}

export function buildTransportSectionConfig(state: OtherSettingsState): TransportSectionConfig {
  return {
    transportConfiguration: {
      allowed: undefined,
      editable: state.permissions.canEditTransportConfiguration,
      visible: state.hasFields.transportConfiguration,
    },
  };
}

export function buildResaleSectionConfig(state: TicketSettingsState): ResaleSectionConfig {
  return {
    allowInvitationReselling: {
      allowed: undefined,
      editable: state.permissions.canEditAllowInvitationReselling,
      visible: state.hasFields.allowInvitationReselling,
    },
    resellingProviders: {
      allowed: [ResaleProvider.TicketSwap, ResaleProvider.Rebel, ResaleProvider.Menta],
      editable: state.permissions.canEditResellingProviders,
      visible: state.hasFields.resellingProviders,
    },
  };
}

export function buildOverrideCapacitySectionConfig(state: OtherSettingsState): OverrideCapacitySectionConfig {
  return {
    limit: {
      allowed: undefined,
      editable: state.permissions.canEditOverrideCapacityLimit,
      visible: true,
    },
  };
}

export function buildCancellationSettingsSectionConfig(state: OtherSettingsState): CancellationSettingsSectionConfig {
  const canEditAllowTicketCancellations = state.permissions.canEditAllowTicketCancellations;

  return {
    allowTicketCancellations: {
      allowed: undefined,
      editable: canEditAllowTicketCancellations,
      visible: state.hasFields.cancellationSettings,
    },
    hoursBeforeSessionCancellationNotAllowed: {
      allowed: undefined,
      editable: canEditAllowTicketCancellations && state.permissions.canEditHoursBeforeSessionCancellationNotAllowed,
      visible: state.hasFields.cancellationSettings,
    },
  };
}

export function buildSettingsConfigs(
  mainState: MainSettingsState,
  otherState: OtherSettingsState,
  ticketState: TicketSettingsState,
  options: BuildSettingsConfigsOptions = {},
): SettingsConfigs {
  const hasAnySelectorField =
    otherState.hasFields.calendarSelector ||
    otherState.hasFields.continuousTimeSelector ||
    otherState.hasFields.sessionSelectorType ||
    otherState.hasFields.selectorSettingType ||
    otherState.hasFields.labelFormat;

  return {
    cancellations: otherState.hasFields.cancellationSettings ? buildCancellationSettingsSectionConfig(otherState) : null,
    contract: mainState.hasFields.contract ? buildContractSectionConfig(mainState) : null,
    disallowIndexing: otherState.hasFields.disallowIndexing ? buildDisallowIndexingSectionConfig(otherState) : null,
    eventRedirect: otherState.hasFields.redirectToId ? buildEventRedirectSectionConfig(otherState, options) : null,
    externalPlatforms: otherState.hasFields.denyPublishingInOta ? buildExternalPlatformsSectionConfig(otherState) : null,
    general: mainState.hasFields.generalSettings ? buildGeneralSectionConfig(mainState) : null,
    overrideCapacity:
      otherState.hasFields.overrideCapacityLimit && otherState.permissions.canViewOverrideCapacityLimit
        ? buildOverrideCapacitySectionConfig(otherState)
        : null,
    postPurchase: otherState.hasFields.postPurchaseReview ? buildPostPurchaseSectionConfig(otherState) : null,
    prices: mainState.hasFields.prices ? buildPricesSectionConfig(mainState) : null,
    resale:
      ticketState.hasFields.resellingProviders || ticketState.hasFields.allowInvitationReselling
        ? buildResaleSectionConfig(ticketState)
        : null,
    selector: hasAnySelectorField ? buildSelectorSettingsSectionConfig(otherState) : null,
    transport: otherState.hasFields.transportConfiguration ? buildTransportSectionConfig(otherState) : null,
    validation: mainState.hasFields.validation ? buildValidationSectionConfig(mainState) : null,
  };
}

export function buildMainSettingsStateFromSettings(settings: Partial<MainPlanSettings>): MainSettingsState {
  const permissions = Array.isArray(settings.permissions) ? settings.permissions : [];

  return {
    allowedValues: {
      categoryTypes: settings.categoryAllowedValues ?? [],
      partnershipTypes: settings.partnershipTypeAllowedValues ?? [],
      planTypes: settings.typeAllowedValues ?? [],
      validationMethods: (settings.validationMethodAllowedValues as ValidationMethod[]) ?? [],
    },
    hasFields: {
      category: settings.category !== undefined || settings.categoryAllowedValues !== undefined,
      cities: settings.cities !== undefined,
      contract: settings.partnershipType !== undefined || settings.contracts !== undefined,
      contracts: settings.contracts !== undefined,
      generalSettings: settings.cities !== undefined || settings.type !== undefined || settings.category !== undefined,
      partnershipType: settings.partnershipType !== undefined || settings.partnershipTypeAllowedValues !== undefined,
      priceList: settings.hasPriceListPricing !== undefined,
      prices: settings.mustUseTaxBase !== undefined || settings.hasPriceListPricing !== undefined,
      taxCalculation: settings.mustUseTaxBase !== undefined,
      type: settings.type !== undefined,
      validation: settings.validationMethod !== undefined || settings.validationWindow !== undefined,
      validationMethod: settings.validationMethod !== undefined,
      validationWindow: settings.validationWindow !== undefined,
    },
    permissions: {
      canEditCategory: permissions.includes('can_edit_category'),
      canEditCities: permissions.includes('can_edit_cities'),
      canEditContracts: permissions.includes('can_edit_contracts'),
      canEditPartnershipType: permissions.includes('can_edit_partnership_type'),
      canEditPriceList: permissions.includes('can_edit_has_price_list_pricing'),
      canEditTaxCalculation: permissions.includes('can_edit_must_use_tax_base'),
      canEditType: false,
      canEditValidationMethod: permissions.includes('can_edit_validation_method'),
      canEditValidationWindow: permissions.includes('can_edit_can_validate_method'),
    },
  };
}

export function buildOtherSettingsStateFromSettings(settings: Partial<MainPlanSettings>): OtherSettingsState {
  const permissions = Array.isArray(settings.permissions) ? settings.permissions : [];
  const canEditTransportConfiguration = permissions.includes('can_edit_transport_configuration');

  return {
    allowedValues: {
      selectorSettingTypes: (settings.selectorSettingTypeAllowedValues as SelectorSettingType[]) ?? [],
      sessionSelectorTypes: (settings.sessionSelectorTypeAllowedValues as SessionSelectorType[]) ?? [],
    },
    hasFields: {
      calendarSelector: settings.calendarSelector !== undefined && settings.calendarSelector !== null,
      cancellationSettings: settings.allowTicketCancellations !== undefined && settings.allowTicketCancellations !== null,
      continuousTimeSelector: settings.continuousTimeSelector !== undefined && settings.continuousTimeSelector !== null,
      denyPublishingInOta: settings.denyPublishingInOta !== undefined && settings.denyPublishingInOta !== null,
      disallowIndexing: settings.disallowIndexing !== undefined && settings.disallowIndexing !== null,
      labelFormat: settings.labelFormat !== undefined && settings.labelFormat !== null,
      overrideCapacityLimit: settings.overrideCapacityLimit !== undefined,
      postPurchaseReview: settings.requestGeneralReview !== undefined && settings.requestGeneralReview !== null,
      redirectToId: settings.redirectToId !== undefined,
      selectorSettingType: settings.selectorSettingType !== undefined && settings.selectorSettingType !== null,
      sessionSelectorType: settings.sessionSelectorType !== undefined && settings.sessionSelectorType !== null,
      transportConfiguration: settings.transportConfiguration !== undefined || canEditTransportConfiguration,
    },
    permissions: {
      canEditAllowTicketCancellations: permissions.includes('can_edit_allow_ticket_cancellations'),
      canEditCalendarSelector: permissions.includes('can_edit_calendar_selector'),
      canEditContinuousTimeSelector: permissions.includes('can_edit_continuous_time_selector'),
      canEditDenyPublishingInOta: permissions.includes('can_edit_deny_publishing_in_ota'),
      canEditDisallowIndexing: permissions.includes('can_edit_disallow_indexing'),
      canEditHoursBeforeSessionCancellationNotAllowed: permissions.includes('can_edit_hours_before_session_cancellation_not_allowed'),
      canEditLabelFormat: permissions.includes('can_edit_label_format'),
      canEditOverrideCapacityLimit: permissions.includes('can_edit_override_capacity_limit'),
      canEditRedirectToId: permissions.includes('can_edit_redirect_to_id'),
      canEditRequestGeneralReview: permissions.includes('can_edit_request_general_review'),
      canEditSelectorSettingType: permissions.includes('can_edit_selector_setting_type'),
      canEditSessionSelectorType: permissions.includes('can_edit_session_selector_type'),
      canEditTransportConfiguration,
      canViewOverrideCapacityLimit:
        permissions.includes('can_view_override_capacity_limit') || permissions.includes('can_edit_override_capacity_limit'),
    },
  };
}

export function buildTicketSettingsStateFromSettings(settings: Partial<MainPlanSettings>): TicketSettingsState {
  const permissions = Array.isArray(settings.permissions) ? settings.permissions : [];
  const isRedeemNow = settings.type === PlanType.redeemNow;
  const canEditResellingProviders = !isRedeemNow && permissions.includes('can_edit_reselling_providers');
  const canEditAllowInvitationReselling = !isRedeemNow && permissions.includes('can_edit_allow_invitation_reselling');

  return {
    hasFields: {
      allowInvitationReselling: !isRedeemNow && (settings.allowInvitationReselling !== undefined || canEditAllowInvitationReselling),
      resellingProviders: !isRedeemNow && ((settings.resellingProviders ?? []).length > 0 || canEditResellingProviders),
    },
    permissions: {
      canEditAllowInvitationReselling,
      canEditResellingProviders,
    },
  };
}
