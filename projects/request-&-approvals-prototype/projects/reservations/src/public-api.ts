/**
 * Public API of the @fz/reservations library (B2BR-5377) — the calls, plus one component.
 *
 * The seven distributor-rooted calls a reservation journey makes: the four reservation-capability
 * checks, reserving a cart, reading a reservation and listing them. Each is addressed by the ids the
 * backend asks for — the pair `{distributorId, targetOrganizationId}` in the path for most, and for the
 * reservation read the acting `organizationId` alone, carried in `X-Scoped-Organization-Id`.
 *  Eventually all will be moved to that schema. Either way those ids arrive as a **call argument** rather
 * than ambient state — that is what lets FeverZone and B2B Marketplace share it while keeping their own
 * ideas about how a partner gets chosen.
 *
 * They land one call per PR. Here: **reading a reservation**, and with it the reservation domain.
 *
 * Every call answers the domain value and lets a failure through, as `@fz/ticketing` does: the host
 * catches it once, where it already catches its own. The `{ data, error }` envelope is the wire format
 * rather than the answer - the adapters unwrap it, and `null` means no value, never a failure.
 *
 * The DTOs (`*Api`), the mappers and the clients' internals stay unexported — consumers get the domain
 * types, the clients, the config token and the provider, re-exported through `lib/core/index.ts` rather
 * than deep file paths. Spec: `plans/B2BR/B2BR-5377_distributor-entry-ui/spec.md` §4.3, which lands
 * with PR #12541.
 */
export { provideReservations, withReservationCapability, withReservations, type ReservationsFeature } from './lib/provide-reservations';
export { RESERVATIONS_CONFIG, type ReservationsConfig } from './lib/reservations.config';
export { ReservationCapabilityClient } from './lib/reservation-capability-client.service';
export { ReservationsClient, type ReservationsDownloadFormat } from './lib/reservations-client.service';

/**
 * The one component this library ships. It renders the cart a reservation is about to commit, and it
 * is the shared copy FeverZone's `cart-detail-v2` and B2B Marketplace's checkout summary both converge
 * onto. Presentation only: it takes a pre-formatted view model of strings, so the two apps keep their
 * own money representations and their own wording. See `lib/ui/` in AGENTS.md.
 */
export { ReservationsCartCardComponent } from './lib/ui/cart-card/cart-card.component';
export type {
  ReservationsCartCardLabels,
  ReservationsCartCardLine,
  ReservationsCartCardSession,
  ReservationsCartCardView,
} from './lib/ui/cart-card/cart-card-view.model';

// Result contract: consumers need these to type what they pass in and what comes back.
export type { BaseResponse } from '@fz/http-models';
export {
  isReservationExportTooMany,
  isReservationNotAllowed,
  RESERVATION_EXPORT_TOO_MANY_CODE,
  RESERVATION_FORBIDDEN_CODE,
} from './lib/core';
export type {
  BusinessType,
  CapabilityQuery,
  DistributorTarget,
  OnBehalfTarget,
  EvaluateCapabilityPayload,
  EvaluateReservationCapabilityResponse,
  ExpirationStrategy,
  Deposit,
  DepositStatus,
  Money,
  NewReservation,
  NewReservationOrder,
  PurchaseCloseEvaluation,
  PurchaseCloseQuery,
  Reservation,
  ReservationAttendance,
  ReservationContactUpdate,
  ReservationDetail,
  ReservationDiscountModality,
  ReservationEndCustomerUpdate,
  ReservationOrder,
  ReservationOrderTicket,
  ReservationOrderTicketCode,
  ReservationOrderTicketCodeType,
  ReservationSessionItem,
  ReservationExternalLocator,
  ReservationCapabilityConfigurationStatus,
  ReservationCapabilitySettings,
  ReservationNote,
  ReservationPayment,
  ReservationPaymentLink,
  ReservationPlanSummary,
  ReservationPurchaseUrl,
  ReservationPurchaseUrlsQuery,
  ReservationSessionItemTicketsAllowed,
  ReservationsOrder,
  ReservationsOrderDirection,
  ReservationsPage,
  ReservationsPagination,
  ReservationsQuery,
  ReservationStatus,
  ReserveB2bEmployee,
  ReserveExpirationReminder,
  ReservePayload,
  ReservePayment,
  ReservePaymentGateway,
  ReservePaymentMethod,
} from './lib/core';
