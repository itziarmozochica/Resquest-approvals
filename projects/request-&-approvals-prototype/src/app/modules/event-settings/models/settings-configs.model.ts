import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import { PlanOption } from '../../../shared/search-bar/models/plan-option.model';
import { PlanCategory, PlanType } from './general-section.enum';
import { RequestGeneralReview } from './post-purchase-section.enum';
import { ResaleProvider } from './resale-section.enum';
import { SelectorSettingType, SessionSelectorType } from './selector-session-section.enum';
import { ValidationMethod, ValidationWindow } from './validation-section.enum';

export interface FieldConfig<T> {
  editable: boolean;
  visible: boolean;
  allowed?: T[];
}

export interface GeneralSectionConfig {
  category: FieldConfig<PlanCategory>;
  cities: FieldConfig<number[]>;
  type: FieldConfig<PlanType>;
}

export interface ValidationSectionConfig {
  validationMethod: FieldConfig<ValidationMethod>;
  validationWindow: FieldConfig<ValidationWindow>;
}

export interface ContractSectionConfig {
  contracts: FieldConfig<string[]>;
  partnershipType: FieldConfig<string>;
}

export interface PricesSectionConfig {
  priceList: FieldConfig<boolean>;
  taxCalculation: FieldConfig<boolean>;
}

export interface SelectorSettingsSectionConfig {
  calendar: FieldConfig<boolean>;
  continuousTime: FieldConfig<boolean>;
  labelFormat: FieldConfig<string>;
  session: FieldConfig<SessionSelectorType>;
  setting: FieldConfig<SelectorSettingType>;
}

export interface ExternalPlatformsSectionConfig {
  allowPublishingInOta: FieldConfig<boolean>;
}

export interface PostPurchaseSectionConfig {
  requestGeneralReview: FieldConfig<RequestGeneralReview>;
}

export interface DisallowIndexingSectionConfig {
  disallowIndexing: FieldConfig<boolean>;
}

export interface OverrideCapacitySectionConfig {
  limit: FieldConfig<number | null>;
}

export interface CancellationSettingsSectionConfig {
  allowTicketCancellations: FieldConfig<boolean>;
  hoursBeforeSessionCancellationNotAllowed: FieldConfig<number>;
}

export interface EventRedirectSectionConfig {
  cityOptions: SelectOption[];
  inputSelectedCity: SelectOption | null;
  inputSelectedPlan: PlanOption | null;
  plans: PlanOption[];
  redirectEnabled: boolean;
  redirectToId: FieldConfig<number | null>;
}

export interface TransportSectionConfig {
  transportConfiguration: FieldConfig<boolean>;
}

export interface ResaleSectionConfig {
  allowInvitationReselling: FieldConfig<boolean>;
  resellingProviders: FieldConfig<ResaleProvider>;
}

export interface SettingsConfigs {
  cancellations: CancellationSettingsSectionConfig | null;
  contract: ContractSectionConfig | null;
  disallowIndexing: DisallowIndexingSectionConfig | null;
  eventRedirect: EventRedirectSectionConfig | null;
  externalPlatforms: ExternalPlatformsSectionConfig | null;
  general: GeneralSectionConfig | null;
  overrideCapacity: OverrideCapacitySectionConfig | null;
  postPurchase: PostPurchaseSectionConfig | null;
  prices: PricesSectionConfig | null;
  resale: ResaleSectionConfig | null;
  selector: SelectorSettingsSectionConfig | null;
  transport: TransportSectionConfig | null;
  validation: ValidationSectionConfig | null;
}

export interface MainSettingsState {
  allowedValues: {
    categoryTypes: string[];
    partnershipTypes: string[];
    planTypes: string[];
    validationMethods: ValidationMethod[];
  };
  hasFields: {
    category: boolean;
    cities: boolean;
    contract: boolean;
    contracts: boolean;
    generalSettings: boolean;
    partnershipType: boolean;
    priceList: boolean;
    prices: boolean;
    taxCalculation: boolean;
    type: boolean;
    validation: boolean;
    validationMethod: boolean;
    validationWindow: boolean;
  };
  permissions: {
    canEditCategory: boolean;
    canEditCities: boolean;
    canEditContracts: boolean;
    canEditPartnershipType: boolean;
    canEditPriceList: boolean;
    canEditTaxCalculation: boolean;
    canEditType: boolean;
    canEditValidationMethod: boolean;
    canEditValidationWindow: boolean;
  };
}

export interface OtherSettingsState {
  allowedValues: {
    selectorSettingTypes: SelectorSettingType[];
    sessionSelectorTypes: SessionSelectorType[];
  };
  hasFields: {
    calendarSelector: boolean;
    cancellationSettings: boolean;
    continuousTimeSelector: boolean;
    denyPublishingInOta: boolean;
    disallowIndexing: boolean;
    labelFormat: boolean;
    overrideCapacityLimit: boolean;
    postPurchaseReview: boolean;
    redirectToId: boolean;
    selectorSettingType: boolean;
    sessionSelectorType: boolean;
    transportConfiguration: boolean;
  };
  permissions: {
    canEditAllowTicketCancellations: boolean;
    canEditCalendarSelector: boolean;
    canEditContinuousTimeSelector: boolean;
    canEditDenyPublishingInOta: boolean;
    canEditDisallowIndexing: boolean;
    canEditHoursBeforeSessionCancellationNotAllowed: boolean;
    canEditLabelFormat: boolean;
    canEditOverrideCapacityLimit: boolean;
    canEditRedirectToId: boolean;
    canEditRequestGeneralReview: boolean;
    canEditSelectorSettingType: boolean;
    canEditSessionSelectorType: boolean;
    canEditTransportConfiguration: boolean;
    canViewOverrideCapacityLimit: boolean;
  };
}

export interface TicketSettingsState {
  hasFields: {
    allowInvitationReselling: boolean;
    resellingProviders: boolean;
  };
  permissions: {
    canEditAllowInvitationReselling: boolean;
    canEditResellingProviders: boolean;
  };
}

export const DEFAULT_MAIN_SETTINGS_STATE: MainSettingsState = {
  allowedValues: {
    categoryTypes: [],
    partnershipTypes: [],
    planTypes: [],
    validationMethods: [],
  },
  hasFields: {
    category: false,
    cities: false,
    contract: false,
    contracts: false,
    generalSettings: false,
    partnershipType: false,
    priceList: false,
    prices: false,
    taxCalculation: false,
    type: false,
    validation: false,
    validationMethod: false,
    validationWindow: false,
  },
  permissions: {
    canEditCategory: false,
    canEditCities: false,
    canEditContracts: false,
    canEditPartnershipType: false,
    canEditPriceList: false,
    canEditTaxCalculation: false,
    canEditType: false,
    canEditValidationMethod: false,
    canEditValidationWindow: false,
  },
};

export const DEFAULT_OTHER_SETTINGS_STATE: OtherSettingsState = {
  allowedValues: {
    selectorSettingTypes: [],
    sessionSelectorTypes: [],
  },
  hasFields: {
    calendarSelector: false,
    cancellationSettings: false,
    continuousTimeSelector: false,
    denyPublishingInOta: false,
    disallowIndexing: false,
    labelFormat: false,
    overrideCapacityLimit: false,
    postPurchaseReview: false,
    redirectToId: false,
    selectorSettingType: false,
    sessionSelectorType: false,
    transportConfiguration: false,
  },
  permissions: {
    canEditAllowTicketCancellations: false,
    canEditCalendarSelector: false,
    canEditContinuousTimeSelector: false,
    canEditDenyPublishingInOta: false,
    canEditDisallowIndexing: false,
    canEditHoursBeforeSessionCancellationNotAllowed: false,
    canEditLabelFormat: false,
    canEditOverrideCapacityLimit: false,
    canEditRedirectToId: false,
    canEditRequestGeneralReview: false,
    canEditSelectorSettingType: false,
    canEditSessionSelectorType: false,
    canEditTransportConfiguration: false,
    canViewOverrideCapacityLimit: false,
  },
};

export const DEFAULT_TICKET_SETTINGS_STATE: TicketSettingsState = {
  hasFields: {
    allowInvitationReselling: false,
    resellingProviders: false,
  },
  permissions: {
    canEditAllowInvitationReselling: false,
    canEditResellingProviders: false,
  },
};
