import {
  ContactInformationFieldEnum,
  ContactInformationOrderableFieldEnum,
  ContactInformationRequirementEnum,
  HardwareTypeEnum,
  OnsiteSetupPaymentConfigurationAssignment,
  ReceiptPrinterType,
  SessionAvailabilityCacheStrategyEnum,
  SessionAvailabilityPlanConfigDTO,
  TicketSelectorTypeEnum,
} from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { FormValue } from '@fz-original/app/modules/sessions/shared/components/common-edit-form/common-edit-form.component';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

export interface BoxOfficeOnsiteSetupForm extends FormValue {
  channelId: string;
  canOverrideCapacities?: boolean;
  contactInformationFields?: ContactInformationFieldEnum[];
  contactInformationFieldsOrder?: ContactInformationOrderableFieldEnum[];
  contactInformationRequirement?: ContactInformationRequirementEnum;
  hardwareType?: HardwareTypeEnum;
  isHidden?: boolean;
  paymentConfigurationAssignment?: OnsiteSetupPaymentConfigurationAssignment;
  printConfigurationBundleId?: string | null;
  receiptPrinterType?: ReceiptPrinterType;
  sessionAvailabilityCacheStrategy?: SessionAvailabilityCacheStrategyEnum;
  sessionAvailabilityCacheTimeoutInSeconds?: number;
  sessionAvailabilityPlanOverrideEnabled?: boolean;
  sessionAvailabilityPlanConfigs?: SessionAvailabilityPlanConfigDTO[];
  ticketSelectorType?: TicketSelectorTypeEnum;
}

export interface OnsiteSetupSalesChannelContext {
  loadedPlansSalesChannelId: string | null;
  plansLoadingForSalesChannel: boolean;
  partnerSalesChannelOptions: SelectOption[];
}

export const EMPTY_ONSITE_SETUP_SALES_CHANNEL_CONTEXT: OnsiteSetupSalesChannelContext = {
  loadedPlansSalesChannelId: null,
  plansLoadingForSalesChannel: false,
  partnerSalesChannelOptions: [],
};
