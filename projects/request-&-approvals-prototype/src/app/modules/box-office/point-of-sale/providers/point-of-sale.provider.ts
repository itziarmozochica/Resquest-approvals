import { DestroyRef, type Provider } from '@angular/core';

import { CART_DETAIL_SERVICE, CartDetailService } from '@fz-original/app/shared/cart/services/cart-detail.service';
import { environment } from '@fz-original/environments/environment';
import { provideTicketing, withAvailability, withAvailabilityFetch, withCustomTabs } from '@fz/ticketing';
import { FZT_DATE_SELECTOR_TRANSLATIONS, FZT_TICKET_SELECTOR_TRANSLATIONS } from '@fz/ticketing-ui';
import { TranslateService } from '@ngx-translate/core';

import { MemberAccountIdentificationService } from '../../memberships/services/member-account-identification.service';
import { MembershipsIdentificationService } from '../../memberships/services/memberships-identification.service';
import { CART_LINE_PRICE_CONTROL } from '../../one-stop-shop/components/oss-cart-detail/cart-line-price-control.token';
import { UNAVAILABLE_CART_SESSION_IDS } from '../../one-stop-shop/components/oss-cart-detail/unavailable-cart-session-ids.token';
import { OssOnsiteSetupStore } from '../../one-stop-shop/store/oss-onsite-setup.store';
import { OssPlanSelectionStore } from '../../one-stop-shop/store/oss-plan-selection.store';
import { oneStopShopTrackingProvider } from '../../one-stop-shop/tracking/one-stop-shop.tracking-provider';
import { TicketingUnsavedChangesBypassService } from '../../ticketing/services/ticketing-unsaved-changes-bypass.service';
import { PosPartyHandheldModalService } from '../containers/pos-party-handheld-modal/services/pos-party-handheld-modal.service';
import { PosAvailabilityService } from '../services/availability/pos-availability.service';
import { PosCartService } from '../services/cart/pos-cart.service';
import { PosCouponsService } from '../services/coupons/pos-coupons.service';
import { PosFlexibleBundleService } from '../services/flexible-bundle/pos-flexible-bundle.service';
import { PosMemberAccountService } from '../services/member-account/pos-member-account.service';
import { PosMembershipsService } from '../services/memberships/pos-memberships.service';
import { PosModificationPaymentLinkService } from '../services/modification-payment-link/pos-modification-payment-link.service';
import { PosModifyOrderLinePriceService } from '../services/modify-order-line-price/pos-modify-order-line-price.service';
import { PosOnsiteSetupRefreshService } from '../services/onsite-setup-refresh/pos-onsite-setup-refresh.service';
import { PosPartyIntentService } from '../services/party/pos-party-intent.service';
import { PosUiPortService } from '../services/pos-ui-port/pos-ui-port.service';
import { PosViewUpdateService } from '../services/pos-view-update/pos-view-update.service';
import { PosPreparedCartService } from '../services/prepared-cart/pos-prepared-cart.service';
import { PosPurchaseService } from '../services/purchase/pos-purchase.service';
import { PosScannerService } from '../services/scanner/pos-scanner.service';
import { PosSeatingService } from '../services/seating/pos-seating.service';
import { PosSecondScreenService } from '../services/second-screen/pos-second-screen.service';
import { PosSetupService } from '../services/setup/pos-setup.service';
import { PosShiftService } from '../services/shift/pos-shift.service';
import { PosTicketSelectionService } from '../services/ticket-selection/pos-ticket-selection.service';
import { TicketingCoreService } from '../services/ticketing-core/ticketing-core.service';
import { PosTicketingState } from '../state/pos-ticketing.state';
import { PosAvailabilityStore } from '../store/pos-availability.store';
import { PosFlexibleBundleStore } from '../store/pos-flexible-bundle.store';
import { PosTicketSelectorStore } from '../store/pos-ticket-selector.store';
import { PointOfSaleTicketing } from '../strategies/point-of-sale-ticketing';
import { POS_PARTY_MEMBERS_SOURCE } from '../tokens/pos-party-members-source.token';
import { POS_TICKET_SELECTOR_CATALOG_SOURCE } from '../tokens/pos-ticket-selector-catalog-source.token';
import { TICKETING_STRATEGY } from '../tokens/ticketing-strategy.token';
import { fztDateSelectorTranslationsFactory } from './fzt-date-selector-translations.factory';
import { fztTicketSelectorTranslationsFactory } from './fzt-ticket-selector-translations.factory';
import { posAvailabilityFetchConfigFactory } from './pos-availability-fetch-config.factory';
import { posPartyMembersSourceFactory } from './pos-party-members-source.factory';
import { posTicketSelectorCatalogSourceFactory } from './pos-ticket-selector-catalog-source.factory';
import { posUnavailableCartSessionIdsFactory } from './pos-unavailable-cart-session-ids.factory';

/**
 * Everything `PointOfSaleComponent` provides, in one reviewable unit. All of it is
 * **component-scoped**, so the whole POS state graph dies when the route is left — and a future flow
 * can copy this file as `provideInvitationTicketing()` against the same tokens.
 *
 * Every entry below is a runtime-only break if omitted: none of them produce a compile error.
 */
export const providePointOfSale = (): Provider[] => [
  // Tracking — reuse, don't fork: identical Mixpanel payloads across the flag.
  ...oneStopShopTrackingProvider(),

  // Reused by the duplicated template's modals.
  OssOnsiteSetupStore,
  OssPlanSelectionStore,

  // Child components inject CART_DETAIL_SERVICE (BaseTicketingComponent parity).
  CartDetailService,
  { provide: CART_DETAIL_SERVICE, useExisting: CartDetailService },

  // Absorbed from TicketingWrapperComponent.
  TicketingUnsavedChangesBypassService,

  // `@fz/ticketing` availability domain, component-scoped like everything else here. The front cache
  // (`withAvailabilityCache()`) is NOT here on purpose: it is provided by the box-office route module
  // so a Fast load setup keeps its entries across route re-entry (B2BS-1868). `apiBaseUrl` must not
  // end with a slash — see the availability contracts in `projects/ticketing/AGENTS.md`.
  ...provideTicketing(
    { apiBaseUrl: environment.apiBaseUrl, gatewayBaseUrl: environment.apiGWBaseUrl },
    withAvailability(),
    withAvailabilityFetch(posAvailabilityFetchConfigFactory),
    withCustomTabs(),
  ),
  PosAvailabilityStore,
  PosTicketSelectorStore,
  PosFlexibleBundleStore,
  { provide: POS_TICKET_SELECTOR_CATALOG_SOURCE, useFactory: posTicketSelectorCatalogSourceFactory },
  { provide: POS_PARTY_MEMBERS_SOURCE, useFactory: posPartyMembersSourceFactory },

  // `@fz/ticketing-ui` copy: the library owns English defaults, the host owns ngx-translate.
  {
    deps: [TranslateService, DestroyRef],
    multi: true,
    provide: FZT_DATE_SELECTOR_TRANSLATIONS,
    useFactory: fztDateSelectorTranslationsFactory,
  },
  {
    deps: [TranslateService, DestroyRef],
    multi: true,
    provide: FZT_TICKET_SELECTOR_TRANSLATIONS,
    useFactory: fztTicketSelectorTranslationsFactory,
  },

  // Business-layer infrastructure.
  MemberAccountIdentificationService,
  MembershipsIdentificationService,
  PosTicketingState,
  {
    provide: UNAVAILABLE_CART_SESSION_IDS,
    useFactory: posUnavailableCartSessionIdsFactory,
  },
  TicketingCoreService,
  PosUiPortService,
  PosViewUpdateService,

  // Domain services (10) — must be registered before the facade that injects them.
  PosAvailabilityService,
  PosCartService,
  PosCouponsService,
  PosPurchaseService,
  PosScannerService,
  PosSeatingService,
  PosSecondScreenService,
  PosSetupService,
  PosShiftService,
  PosTicketSelectionService,

  // Lego domain services — injected directly by the component, outside the facade's cascade.
  PosMemberAccountService,
  PosMembershipsService,
  PosFlexibleBundleService,
  PosModificationPaymentLinkService,
  PosOnsiteSetupRefreshService,
  PosPartyIntentService,
  PosPreparedCartService,
  PosModifyOrderLinePriceService,
  { provide: CART_LINE_PRICE_CONTROL, useExisting: PosModifyOrderLinePriceService },

  // The By party phone sheet: opened by the page's header calendar action below `lg`.
  PosPartyHandheldModalService,

  // Facade behind the single swap-point token.
  { provide: TICKETING_STRATEGY, useClass: PointOfSaleTicketing },
];
