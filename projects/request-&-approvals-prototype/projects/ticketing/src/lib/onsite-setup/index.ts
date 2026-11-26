// Angular wiring. The services are collaborators of a consumer store or of a smart container that
// owns the selection flow — see the "Onsite-setup domain contracts" section of the package AGENTS.md.
export { TicketingOnsiteSetupSelectionService } from './services/onsite-setup-selection.service';
export { ONSITE_SETUP_CONFIG_STORAGE_KEY, TicketingOnsiteSetupStorageService } from './services/onsite-setup-storage.service';
export { TicketingOnsiteSetupService } from './services/onsite-setup.service';
export { TicketingRecentOnsiteSetupsService } from './services/recent-onsite-setups.service';
export { withOnsiteSetup } from './with-onsite-setup';

// Store feature, plus the one store this library ships: two consumers in different packages (the
// F&B host and the `@fz/ticketing-ui` modal) need the same injection token, so the token lives here
// and the host provides it once at its route root. A consumer wanting a private copy composes the
// feature into its own `signalStore(...)` instead.
export { withOnsiteSetupStoreFeature, type WithOnsiteSetupStoreFeature } from './store/onsite-setup.feature';
export { OnsiteSetupStore } from './store/onsite-setup.store';
export type { OnsiteSetupStoreState } from './models/store/onsite-setup-store.model';

// Domain models and the dialog result.
export { EMPTY_ONSITE_SETUPS_SUMMARY } from './models/onsite-setups-summary.model';
export type { OnsiteSetupsSummary, OnsiteSetupSummary, PlaceSummary } from './models/onsite-setups-summary.model';
export type { OnsiteSetupOption, OnsiteSetupVenueOption } from './models/onsite-setup-option.model';
export type { OnsiteSetupSelection } from './models/onsite-setup-selection.model';
export type { RecentOnsiteSetup } from './models/recent-onsite-setup.model';

// Query contracts of the three onsite-setup endpoints.
export type { GetOnsiteSetupByPlaceQuery, GetOnsiteSetupQuery, OnsiteSetupQueryBase } from './models/onsite-setup-query.model';

// Summary utils — framework-free, so a consumer derives venue/setup options wherever it needs them.
export {
  findPlaceSummary,
  getOnsiteSetupOptionsFromSummary,
  getVenueOptionsFromSummary,
  hasOnsiteSetups,
} from './utils/onsite-setups-summary.util';

// Error classification. The services do not wrap errors, so the caller decides what a 404 means.
export { isOnsiteSetupNotFoundError } from './utils/onsite-setup-not-found.util';

// The one wire model that is public: `onsite_setup_config` stores the payload verbatim, so hosts
// reading it need the wire shape and the literal unions its fields carry. The summary wire model
// stays internal — nothing outside this library sees it.
export type {
  ContactInformationSetupApi,
  OnsiteSetup,
  OnsiteSetupApi,
  OnsiteSetupOssCustomTabApi,
  OnsiteSetupPaymentConfigurationApi,
  OnsiteSetupPaymentConfigurationIntegratedGatewayApi,
  OnsiteSetupPaymentConfigurationMethodApi,
  OnsiteSetupPaymentConfigurationTerminalApi,
  OnsiteSetupPlaceApi,
  PaymentConfigurationGatewayProvider,
  PaymentMethodSetupApi,
  PayhereProviderConfigApi,
  ProviderConfigApi,
  SessionAvailabilityPlanConfigApi,
  SquareProviderConfigApi,
} from './models/api/onsite-setup.api';
export { OBO_PRINTER_TYPE_NONE, OBO_PRINTER_TYPE_ZEBRA, ONSITE_SETUP_DEVICE_TYPE_BOX_OFFICE } from './models/api/onsite-setup.literals';
export type {
  ContactInformationField,
  ContactInformationRequirement,
  CutterType,
  OboFlowType,
  OboPrinterType,
  OnsiteDeviceType,
  OnsiteSetupPaymentGateway,
  OssCustomTabType,
  PaperType,
  PriceViewer,
  ReceiptPrinterType,
  SessionAvailabilityCacheStrategy,
  ShiftStrategy,
  TicketSelectorType,
  TicketValidationType,
} from './models/api/onsite-setup.literals';

// Custom tabs — a separate slice of this domain: a custom tab is an instance of an onsite setup and
// cannot exist without one, so it lives here, but it keeps its own DI feature, service, store
// feature, models and utils. Wire models, `customTabConfig`, the adapter and the params mapper stay
// internal.
export { withCustomTabs } from './with-custom-tabs';
export { TicketingCustomTabsService } from './services/custom-tabs/custom-tabs.service';
export { withCustomTabsStoreFeature, type WithCustomTabsStoreFeature } from './store/custom-tabs/custom-tabs.feature';
export type { CustomTabSetup, FetchCustomTabParams } from './store/custom-tabs/custom-tabs.feature';
export type { CustomTabState, CustomTabsStoreState } from './models/custom-tabs/store/custom-tabs-store.model';
export { CustomTileTargetType, isHierarchyTargetType } from './models/custom-tabs/custom-tile.model';
export type {
  CustomTile,
  CustomTileExtraInfo,
  HierarchyCategory,
  HierarchyExtraInfo,
  HierarchyProduct,
  HierarchyProductVariation,
  SessionTypeExtraInfo,
} from './models/custom-tabs/custom-tile.model';
export type {
  CustomTabHierarchyLeafNode,
  CustomTabHierarchyLevel,
  CustomTabHierarchyParentNode,
} from './models/custom-tabs/custom-tab-hierarchy.model';
export type { CustomTabForDateQuery } from './models/custom-tabs/custom-tabs-query.model';
export { buildCustomTabHierarchy } from './utils/custom-tabs/build-custom-tab-hierarchy.util';
