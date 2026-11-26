import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { TicketTimeGranularity } from '@fz-original/app/shared/models/order/ticket-time-granularity.enum';

import {
  AddOnConfiguration as PriceListItemAddOnConfiguration,
  AddOnConfigurationDTO as PriceListItemAddOnConfigurationDTO,
  ProductTaxRate,
  ProductTaxRateDTO,
} from '../../../modules/sessions/shared/models/price-list-item.model';
import { AddOnCategory } from './add-on-category.enum';

export { AddOnCategory } from './add-on-category.enum';

export interface AllowedNumTickets {
  minimum: number;
  maximum: number;
}

export interface NeededSessionType {
  id: number;
  label: string;
  allowedNumTickets: AllowedNumTickets;
}

export interface SessionTypeGroupSummaryDTO {
  id: number;
  name: string;
  is_asset_based?: boolean;
}

/** Wire format for session type detail (v1) and other APIs that return full tag metadata. */
export interface SessionTypeTagDTO {
  id: number;
  label: string;
}

/**
 * Domain tag for UI and app logic. `id` is optional when the source API only returns labels
 * (e.g. session-types inventory 3.0). Ideally the backend should align all session-type
 * endpoints to return the same tag shape (e.g. always {@link SessionTypeTagDTO}).
 */
export interface SessionTypeTag {
  id?: number;
  label: string;
}

/**
 * Session-types inventory 3.0 may return each tag as a plain string or as `{ id, label }`.
 * Ideally the backend should use the same shape as {@link SessionTypeTagDTO} everywhere.
 */
export type InventorySessionTypeTagFromApi = string | SessionTypeTagDTO;

export interface PackedSessionTypeDTO {
  id: number;
  quantity: number;
}

export interface CreatePackedSessionTypeDTO {
  session_type_id: number;
  quantity: number;
}

export type PackedSessionType = PackedSessionTypeDTO;

export interface SessionTypeSummaryDTO {
  id: number;
  label: string;
  archived_at?: string | null;
  is_add_on: boolean;
  has_details: boolean;
  has_instructions: boolean;
  allowed_min_tickets: number;
  allowed_max_tickets: number;
  groups: SessionTypeGroupSummaryDTO[];
  default_capacity?: number;
  must_use_tax_base?: boolean;
  tax_product_rate?: number;
  tax_surcharge_rate?: number;
  packed_session_types?: PackedSessionTypeDTO[];
  product_tax_rate?: ProductTaxRateDTO;
  is_shop_product: boolean;
  add_on_configuration?: PriceListItemAddOnConfigurationDTO;
}

export interface GetSessionTypeSummariesDTO {
  session_types: SessionTypeSummaryDTO[];
}

export interface SessionTypeGroupDTO {
  id: number;
  name: string;
  default_capacity: number | null;
}

export interface SessionTypeChannelDTO {
  session_type_id: number;
  channel_id: string;
  allowed_num_tickets: AllowedNumTickets | null;
}

export interface SessionTypeDTO {
  id: number;
  label: string;
  allowed_num_tickets: AllowedNumTickets | null;
  instructions: string | null;
  details: string;
  is_add_on: boolean;
  use_for_availability: boolean;
  default_capacity: number | null;
  groups: SessionTypeGroupDTO[];
  product_type: string | null;
  tags: SessionTypeTagDTO[];
  display_step: string | null;
  session_type_channels: SessionTypeChannelDTO[] | null;
  is_shop_product: boolean;
  target_attendee: string | null;
  ticket_tier: number | null;
  image_url?: string | null;
  // TODO(B2B-15573): Make mandatory once API always returns archived_at. Adapter defaults to null until then.
  archived_at?: string | null;
}

export interface PatchSessionTypeDTO {
  label?: string;
  allowed_num_tickets?: AllowedNumTickets | null;
  instructions?: string | null;
  details?: string;
  use_for_availability?: boolean;
  is_add_on?: boolean;
  default_capacity?: number | null;
  product_type?: string | null;
  tags?: string[];
  session_type_channels?: SessionTypeChannelDTO[];
  is_shop_product?: boolean;
  target_attendee?: string | null;
  ticket_tier?: number | null;
  image_url?: string | null;
}

export interface PatchSessionTypeGroupDTO {
  default_capacity?: number | null;
}

export interface UpdateSessionTypeGroupDTO {
  name: string;
  session_type_ids: number[];
  asset_activity_id?: number | null;
  asset_activity_pack_id?: number | null;
}

export interface CreateSessionTypeGroupDTO {
  name: string;
  session_type_ids: number[];
  code_image: string;
  frequency: string;
  asset_activity_id?: number | null;
  asset_activity_pack_id?: number | null;
}

export interface SessionTypeRuleNeededSessionTypeDTO {
  session_type: number;
  min: number;
  max: number;
}

export interface InventoryAddOnConfigurationDTO {
  category: string;
  selector_type: string;
  display_step: string;
  pricing_type: string;
  is_selected_by_default: boolean;
  is_affected_by_coupon_discount?: boolean;
  partner_visibility?: string;
  partner_share_percentage?: number | null;
}

export interface InventorySessionTypeRulesDTO {
  selection_rule: string;
  needed_session_types: SessionTypeRuleNeededSessionTypeDTO[] | null;
  visible_only_when_needed_session_types_selected: boolean;
}

export interface InventorySessionTypeChannelDTO {
  channel_id: string;
  name: string;
  allowed_num_tickets_min: number | null;
  allowed_num_tickets_max: number | null;
  is_reseller: boolean;
}

export const EntitlementConfigurationType = {
  purchaseForFree: 'purchase_for_free',
  rescheduleForFree: 'reschedule_for_free',
  shops: 'shops',
} as const;

export type EntitlementConfigurationTypeValue = (typeof EntitlementConfigurationType)[keyof typeof EntitlementConfigurationType];

export interface SessionTypeEntitlementDTO {
  entitlement_configuration_id: number;
  entitlement_configuration_name: string;
  entitlement_configuration_type?: EntitlementConfigurationTypeValue;
}

export interface InventorySessionTypeDTO {
  id: number;
  label: string;
  product_type: string;
  ignore_time_slot_capacity: boolean;
  base_price: number;
  allowed_num_tickets_min: number | null;
  allowed_num_tickets_max: number | null;
  instructions: string;
  details: string;
  sorting: number | null;
  tags: InventorySessionTypeTagFromApi[] | null;
  payment_method: string | null;
  target_attendee: string | null;
  booking_time_granularity: string | null;
  ticket_selector_step_quantity?: number | null;
  ticket_tier: number | null;
  add_on_configuration: InventoryAddOnConfigurationDTO | null;
  rules: InventorySessionTypeRulesDTO | null;
  channels: InventorySessionTypeChannelDTO[];
  packed_session_types: PackedSessionTypeDTO[] | null;
  has_sessions: boolean;
  entitlements?: SessionTypeEntitlementDTO[];
  image_url?: string | null;
  published?: boolean;
  borrowed_from_catalog_main_plan?: boolean;
  is_shop_product: boolean;
  channel_overrides?: ChannelOverrideDTO[];
  // TODO(B2B-15573): Make mandatory once API always returns archived_at. Adapter defaults to null until then.
  archived_at?: string | null;
}

export interface InventorySessionTypeGroupDTO {
  id: number;
  name: string;
  default_capacity: number;
  code_pool_frequency: SessionTypeGroupFrequency;
  image_generator_type: SessionTypeGroupImageGeneratorType;
  is_asset_based?: boolean;
  asset_activity_id?: number | null;
  asset_activity_pack_id?: number | null;
  session_types: InventorySessionTypeDTO[];
}

export interface GetSessionTypesInventoryDTO {
  session_type_groups: InventorySessionTypeGroupDTO[];
  ungrouped_session_types: InventorySessionTypeDTO[];
  // TODO(B2B-15573): Make mandatory once API always returns total_archived. Adapter defaults to 0 until then.
  total_archived?: number;
  default_booking_time_granularity: string;
}

export interface GetSessionTypesInventoryOptions {
  isArchived?: boolean | null;
}

export interface UpdateSessionTypeSortingItemDTO {
  id: number;
  sorting: number;
}

export interface UpdateSessionTypeSortingDTO {
  session_types: UpdateSessionTypeSortingItemDTO[];
}

export interface UpdateBorrowedFromCatalogMainPlanDTO {
  session_type_ids: number[];
}

export interface CreatedSessionTypeDTO {
  id: number;
}

export interface CreateSessionTypeDTO {
  label: string;
  product_type: string | null;
  ticket_price: number | null;
  group_id: number | null;
  details: string;
  instructions: string | null;
  allowed_num_tickets: AllowedNumTickets | null;
  target_attendee: string | null;
  booking_time_granularity: string | null;
  ticket_tier: number | null;
  add_on_configuration: InventoryAddOnConfigurationDTO | null;
  rules: InventorySessionTypeRulesDTO | null;
  packed_session_types?: CreatePackedSessionTypeDTO[] | null;
  image_url?: string | null;
  ticket_selector_step_quantity?: number | null;
}

export interface UpdateSessionTypeChannelDTO {
  channel_id: string;
  allowed_num_tickets: AllowedNumTickets | null;
}

export interface ChannelOverrideDTO {
  channel_id: string;
  display_step?: SessionTypeDisplayStep | null;
  error_message_key?: string | null;
  is_selected_by_default?: boolean | null;
  selector_type?: AddOnViewConfigurationType | null;
  visible_only_when_needed_session_types_selected?: boolean | null;
}

export interface UpdateSessionTypeDTO {
  label?: string;
  product_type?: string | null;
  group_id?: number | null;
  details?: string;
  instructions?: string | null;
  allowed_num_tickets?: AllowedNumTickets | null;
  target_attendee?: string | null;
  booking_time_granularity?: string | null;
  ticket_selector_step_quantity?: number | null;
  ticket_tier?: number | null;
  add_on_configuration?: InventoryAddOnConfigurationDTO | null;
  rules?: InventorySessionTypeRulesDTO | null;
  session_type_channels?: UpdateSessionTypeChannelDTO[] | null;
  channel_overrides?: ChannelOverrideDTO[];
  entitlements?: SessionTypeEntitlementDTO[];
  image_url?: string | null;
}

/**
 * Editable session type fields in the bulk-update API wire format.
 * On `BulkUpdateSessionTypesDTO` these are partial: an omitted key leaves the property unchanged,
 * while `null` explicitly clears or resets it on the API.
 */
export interface SessionTypeBulkEditValuesDTO {
  product_type: string | null;
  group_id: number | null;
  details: string;
  instructions: string | null;
  label: string;
  allowed_num_tickets: AllowedNumTickets | null;
  target_attendee: string | null;
  ticket_tier: number | null;
  rules: InventorySessionTypeRulesDTO | null;
}

export type BulkUpdateSessionTypesDTO = {
  session_type_ids: number[];
} & Partial<SessionTypeBulkEditValuesDTO>;

export interface BulkUpdateSessionTypesJobDTO {
  job_request_id: string;
}

export type BulkUpdateSessionTypesResult = { kind: 'applied' } | { jobRequestId: string; kind: 'queued' };

export type BulkUpdateSessionTypesAcrossPlansRequestDTO = {
  main_plan_id: number;
} & BulkUpdateSessionTypesDTO;

export interface BulkUpdateSessionTypesAcrossPlansDTO {
  requests: BulkUpdateSessionTypesAcrossPlansRequestDTO[];
}

export interface BulkUpdateSessionTypesAcrossPlansJobDTO {
  job_request_id: string;
  main_plan_id: number;
}

export interface BulkUpdateSessionTypesAcrossPlansDataDTO {
  job_requests: BulkUpdateSessionTypesAcrossPlansJobDTO[];
}

export interface BulkUpdateSessionTypesAcrossPlansJob {
  jobRequestId: string;
  planId: number;
}

export interface BulkUpdateSessionTypesAcrossPlansResult {
  jobs: readonly BulkUpdateSessionTypesAcrossPlansJob[];
}

export const BULK_UPDATE_SESSION_TYPES_MAX_SELECTION = 200;

export const NO_GROUP_OPTION_ID = 'NO_GROUP';
export const NO_SELECTION_RULE_OPTION_ID = 'no_rule';

export const SessionTypeBulkEditProperty = {
  allowedNumTickets: 'allowedNumTickets',
  details: 'details',
  group: 'group',
  instructions: 'instructions',
  label: 'label',
  productType: 'productType',
  selectionRule: 'selectionRule',
  targetAttendee: 'targetAttendee',
  ticketTier: 'ticketTier',
} as const;

export type SessionTypeBulkEditPropertyValue = (typeof SessionTypeBulkEditProperty)[keyof typeof SessionTypeBulkEditProperty];

export interface SessionTypeBulkEditValuesShape {
  allowedNumTickets: AllowedNumTickets | null;
  details: string;
  group: SelectOption | null;
  instructions: string;
  label: string;
  productType: SelectOption | null;
  rule: SessionTypeRuleFormValue | null;
  targetAttendee: SelectOption | null;
  ticketTier: number | null;
}

export type SessionTypeBulkEditValues = Partial<SessionTypeBulkEditValuesShape>;

export interface SessionTypeBulkEditFormValue {
  properties: SessionTypeBulkEditPropertyValue[];
  sessionTypeIds: number[];
  values: SessionTypeBulkEditValues;
}

export enum SessionTypeGroupFrequency {
  perTimeSlot = 'per_day_and_time',
  perDay = 'per_day',
  perPlan = 'per_plan',
  sharedPerDayAndTime = 'shared_per_day_and_time',
}

export enum SessionTypeGroupImageGeneratorType {
  QR = 'generate_naive_qr',
  QRAnimation = 'generate_naive_qr_animation',
  barCode = 'generate_barcode_code128',
  noImage = 'generate_no_image',
}

export enum SessionTypeSelectionRule {
  required = 'required',
  standalone = 'standalone',
  needsSessionType = 'needs_session_type',
}

export enum SessionTypeTargetAttendee {
  infant = 'infant',
  child = 'child',
  youth = 'youth',
  adult = 'adult',
  senior = 'senior',
}

export enum AddOnPartnerVisibility {
  feverAndPartners = 'fever_and_partners',
  feverOnly = 'fever_only',
}

export enum AddOnViewConfigurationType {
  toggle = 'toggle',
  stepper = 'stepper',
}

export enum SessionTypeDisplayStep {
  Checkout = 'checkout',
  TicketSelector = 'ticket_selector',
  PlanViewCTASheet = 'plan_view_cta_sheet',
  SeatingMapCTASheet = 'seating_map_cta_sheet',
  Hidden = 'hidden',
}

export enum AddOnPricingType {
  fixedAmount = 'fixed_amount',
  percentageOverBasePrice = 'percentage_over_base_price',
  fixedAmountDefinedByServer = 'fixed_amount_defined_by_server',
  fixedAmountPerIndividualTicket = 'fixed_amount_per_individual_ticket',
}

export enum SessionTypeCategory {
  addOn = 'addOn',
  cancellationInsurance = 'cancellationInsurance',
  pack = 'pack',
  premiumRefundPolicy = 'premiumRefundPolicy',
  shopProduct = 'shopProduct',
  standard = 'standard',
  transactionFee = 'transactionFee',
}

export interface FeverOnlyAddOnRejectionDataDTO {
  published_channel_ids_not_allowing_fever_only: string[];
}

export interface FeverOnlyAddOnRejectionEnvelope {
  error?: {
    error?: {
      data?: unknown;
    };
  };
}

export interface SessionTypeChannel {
  sessionTypeId: number;
  channelId: string;
  allowedNumTickets: AllowedNumTickets | null;
  channelName: string | null;
  isReseller?: boolean;
}

export type ChannelOverrideSetting<T> = { kind: 'inherit' } | { kind: 'overrideToValue'; value: T } | { kind: 'overrideToEmpty' };

export interface SessionTypeChannelOverride {
  channelId: string;
  displayStep: ChannelOverrideSetting<SessionTypeDisplayStep>;
  errorMessageKey: ChannelOverrideSetting<string>;
  isSelectedByDefault: ChannelOverrideSetting<boolean>;
  selectorType: ChannelOverrideSetting<AddOnViewConfigurationType>;
  visibleOnlyWhenNeededSessionTypesSelected: ChannelOverrideSetting<boolean>;
}

export interface PatchSessionType {
  label?: string;
  allowedNumTickets?: AllowedNumTickets | null;
  instructions?: string | null;
  details?: string;
  isAddOn?: boolean;
  useForAvailability?: boolean;
  defaultCapacity?: number | null;
  productType?: string | null;
  tags?: string[];
  displayStep?: SessionTypeDisplayStep;
  sessionTypeChannels?: SessionTypeChannel[];
  targetAttendee?: string | null;
  ticketTier?: number | null;
  imageUrl?: string | null;
}

export interface SessionTypeGroupSummary {
  id: number;
  name: string;
  isAssetBased?: boolean;
}

export interface SessionTypeSummary {
  id: number;
  label: string;
  archivedAt?: Date | null;
  isAddOn: boolean;
  isShopProduct?: boolean;
  hasDetails: boolean;
  hasInstructions: boolean;
  minimumTickets: number;
  maximumTickets: number;
  groups: SessionTypeGroupSummary[];
  defaultCapacity?: number;
  packedSessionTypes?: PackedSessionType[];
  addOnConfiguration?: PriceListItemAddOnConfiguration;
}

export interface SessionTypeSummaryWithTaxData extends SessionTypeSummary {
  mustUseTaxBase: boolean;
  taxProductRate: number;
  taxSurchargeRate: number;
  productTaxRate: ProductTaxRate;
}

export interface AddOnConfiguration {
  category: AddOnCategory;
  selectorType: AddOnViewConfigurationType;
  displayStep: SessionTypeDisplayStep;
  pricingType: AddOnPricingType;
  isSelectedByDefault: boolean;
  partnerVisibility: AddOnPartnerVisibility | null;
  partnerSharePercentage?: number | null;
}

export interface SessionTypeRule {
  selectionRule: SessionTypeSelectionRule;
  neededSessionTypes: NeededSessionType[] | null;
  visibleOnlyWhenNeededSessionTypesSelected: boolean;
}

export interface SessionTypeEntitlement {
  entitlementConfigurationId: number;
  entitlementConfigurationName: string;
  entitlementConfigurationType?: EntitlementConfigurationTypeValue;
}

export interface SessionTypeGroup {
  id: number;
  name: string;
  defaultCapacity?: number;
  codePoolFrequency?: SessionTypeGroupFrequency;
  imageGeneratorType?: SessionTypeGroupImageGeneratorType;
  isAssetBased?: boolean;
  assetActivityId?: number | null;
  assetActivityPackId?: number | null;
}

export interface SessionType {
  id: number;
  label: string;
  allowedNumTickets?: AllowedNumTickets | null;
  instructions?: string;
  details: string;
  isAddOn: boolean;
  useForAvailability: boolean;
  defaultCapacity?: number;
  groups: SessionTypeGroup[];
  productType?: string | null;
  /** Normalized tags; see {@link SessionTypeTag}. */
  tags: SessionTypeTag[];
  displayStep?: SessionTypeDisplayStep; // Use the one inside addOnConfiguration instead, this is kept here until the legacy session type form is completely removed
  addOnConfiguration?: AddOnConfiguration | null;
  rule?: SessionTypeRule | null;
  sessionTypeChannels: SessionTypeChannel[] | null;
  isShopProduct: boolean;
  sorting?: number;
  ignoreTimeSlotCapacity?: boolean;
  basePrice?: number;
  targetAttendee?: string | null;
  bookingTimeGranularity?: TicketTimeGranularity | null;
  /** Purchase increment forced on the ticket selector. `null` or `1` means tickets are sold one by one. */
  ticketSelectorStepQuantity?: number | null;
  ticketTier?: number | null;
  packedSessionTypes?: PackedSessionType[] | null;
  hasSessions?: boolean;
  entitlements?: SessionTypeEntitlement[];
  imageUrl?: string | null;
  published?: boolean;
  borrowedFromCatalogMainPlan?: boolean;
  archivedAt: string | null;
  channelOverrides?: SessionTypeChannelOverride[];
}

export interface SessionTypeInventory {
  sessionTypeGroups: SessionTypeGroup[];
  sessionTypes: SessionType[];
  totalArchived: number;
  defaultBookingTimeGranularity: TicketTimeGranularity | null;
}

export interface SessionTypeFormValue {
  id: number;
  label?: string;
  category?: SelectOption;
  categoryId?: string;
  productType?: SelectOption;
  productTypeId?: string | null;
  basePrice?: number;
  group?: SelectOption;
  groupId?: number | null;
  instructions?: string;
  details?: string;
  allowedNumTickets?: AllowedNumTickets | null;
  targetAttendee?: SelectOption | null;
  targetAttendeeId?: string | null;
  bookingTimeGranularity?: SelectOption | null;
  bookingTimeGranularityId?: TicketTimeGranularity | null;
  ticketSelectorStepQuantity?: number | null;
  ticketTier?: number | null;
  packedSessionTypes?: PackedSessionType[] | null;
  addOnConfiguration?: AddOnConfigurationFormValue | null;
  rule?: SessionTypeRuleFormValue | null;
  sessionTypeChannels?: SessionTypeChannel[] | null;
  channelOverrides?: SessionTypeChannelOverride[];
  entitlements?: SessionTypeEntitlement[];
  imageUrl?: string | null;
}

export interface AddOnConfigurationFormValue {
  selectorType: SelectOption;
  displayStep: SelectOption;
  pricingType: SelectOption;
  isSelectedByDefault: boolean;
  partnerVisibility: SelectOption | null;
  partnerSharePercentage?: number | null;
}

export interface SessionTypeRuleFormValue {
  selectionRule: SelectOption;
  neededSessionTypes: SelectOption[] | null;
  visibleOnlyWhenNeededSessionTypesSelected: boolean;
}

export interface SessionTypeGroupFormValue {
  id: number;
  name: string;
  codePoolFrequency: SessionTypeGroupFrequency;
  imageGeneratorType: SessionTypeGroupImageGeneratorType;
  sessionTypes: number[];
  assetActivityId?: number | null;
  assetActivityPackId?: number | null;
}

export type SessionTypeGroupFormRow = {
  sessionType: SelectOption | null;
  quantity: number;
};
