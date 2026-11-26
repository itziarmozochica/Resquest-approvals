import type { B2bPricing } from '../../core/models/money/b2b-pricing.model';
import type { DecimalAmount } from '../../core/models/money/decimal-amount';
import type { Money } from '../../core/models/money/money.model';
import type {
  BookingQuestionApi,
  MoneyApi,
  SeatingApi,
  SessionApi,
  SessionB2bPricingApi,
  SessionTypeApi,
  SessionTypeTagApi,
  SharedAvailabilityBudgetApi,
  SharedAvailabilityRuleApi,
  StrikethroughPriceApi,
  TicketsAllowedApi,
} from '../models/api/session.model';
import type {
  BookingQuestion,
  Seating,
  Session,
  SessionType,
  SharedAvailabilityBudgets,
  SharedAvailabilityRule,
  SharedAvailabilityRuleItemType,
  TicketsAllowed,
} from '../models/session.model';

const DEFAULT_TICKET_SELECTOR_STEP_QUANTITY = 1;
const MAXIMUM_TICKETS_OF_ADD_ON_SELECTED_ONCE = 1;
// A toggle add-on priced per individual ticket is selected once per purchase, because the backend already charges
// one unit for every ticket, and the backend allows one percentage add-on per purchase (B2BO-9343). A fixed amount
// toggle keeps its quantity: partners sell one per ticket.
const TOGGLE_SELECTOR_TYPE = 'toggle';
const FIXED_AMOUNT_PER_INDIVIDUAL_TICKET_PRICING_TYPE = 'fixed_amount_per_individual_ticket';
const PERCENTAGE_OVER_BASE_PRICE_PRICING_TYPE = 'percentage_over_base_price';

export function adaptSessionApi(session: SessionApi, sharedAvailabilityBudgets: SharedAvailabilityBudgets = new Map()): Session {
  const isSelectedOnce = isAddOnSelectedOnce(session.session_type);

  return {
    availableTickets: session.available_tickets,
    b2bPricing: adaptSessionB2bPricingApi(session.b2b),
    bookingQuestions: (session.booking_questions ?? []).map(adaptBookingQuestionApi),
    details: session.details ?? null,
    endsAt: session.end_date,
    id: session.id,
    isHidden: session.is_hidden ?? false,
    isPack: session.is_pack,
    isPurchasable: session.sellable,
    mainPlanId: session.main_plan_id ?? null,
    name: session.name ?? '',
    overrideAvailableTickets: session.override_available_tickets ?? null,
    placeId: session.place_id ?? null,
    purchasableFromDate: session.purchasable_from_date,
    purchasableUntilDate: session.purchasable_until_date,
    seating: adaptSeatingApi(session.seating),
    sessionType: adaptSessionTypeApi(session.session_type, isSelectedOnce),
    sharedAvailabilityRule: adaptSharedAvailabilityRuleApi(
      session.shared_availability_rule,
      session.shared_availability_footprint,
      sharedAvailabilityBudgets,
    ),
    startsAt: session.start_date,
    strikethroughPrice: adaptStrikethroughPriceApi(session.strikethrough_price),
    surchargePerTicket: adaptOptionalMoneyApi(session.surcharge_per_ticket),
    ticketPrice: adaptOptionalMoneyApi(session.price),
    ticketsAllowedPerBooking: capTicketsAllowed(adaptTicketsAllowedApi(session.tickets_allowed_per_booking), isSelectedOnce),
    ticketsAllowedPerBookingExcludingAvailability: capOptionalTicketsAllowed(
      adaptOptionalTicketsAllowedApi(session.tickets_allowed_per_booking_excluding_availability),
      isSelectedOnce,
    ),
    title: session.title,
  };
}

function isAddOnSelectedOnce(sessionType: SessionTypeApi | null | undefined): boolean {
  const addOnConfiguration = sessionType?.add_on_configuration;

  return (
    (addOnConfiguration?.selector_type === TOGGLE_SELECTOR_TYPE &&
      addOnConfiguration.pricing_type === FIXED_AMOUNT_PER_INDIVIDUAL_TICKET_PRICING_TYPE) ||
    addOnConfiguration?.pricing_type === PERCENTAGE_OVER_BASE_PRICE_PRICING_TYPE
  );
}

function capTicketsAllowed(ticketsAllowed: TicketsAllowed, isSelectedOnce: boolean): TicketsAllowed {
  if (!isSelectedOnce) {
    return ticketsAllowed;
  }

  return {
    maximum: Math.min(ticketsAllowed.maximum, MAXIMUM_TICKETS_OF_ADD_ON_SELECTED_ONCE),
    minimum: Math.min(ticketsAllowed.minimum, MAXIMUM_TICKETS_OF_ADD_ON_SELECTED_ONCE),
  };
}

function capOptionalTicketsAllowed(ticketsAllowed: TicketsAllowed | null, isSelectedOnce: boolean): TicketsAllowed | null {
  if (ticketsAllowed === null) {
    return null;
  }

  return capTicketsAllowed(ticketsAllowed, isSelectedOnce);
}

function adaptBookingQuestionApi(question: BookingQuestionApi): BookingQuestion {
  return {
    choices: question.choices ?? [],
    id: question.id,
    label: question.label,
    message: question.message,
    type: question.type,
  };
}

/**
 * Finiteness is not enough: `String()` renders a finite number in exponential notation once it reaches
 * 1e21 or falls below 1e-6, and `"1e+21"` is not a `DecimalAmount` — every function in
 * `core/models/money/decimal-amount` throws on it. Rejecting here keeps `adaptWireAmount`'s promise true, so a
 * consumer that compares or adds a price cannot be handed a string the money primitives refuse.
 */
function isUsableWireAmount(amount: number): boolean {
  return typeof amount === 'number' && Number.isFinite(amount) && !String(amount).includes('e');
}

function adaptWireAmount(amount: number): DecimalAmount {
  return String(amount);
}

function adaptMoneyApi(money: MoneyApi): Money {
  return { amount: adaptWireAmount(money.amount), currency: money.currency };
}

function adaptOptionalMoneyApi(money: MoneyApi | null | undefined): Money | null {
  if (money === undefined || money === null || !isUsableWireAmount(money.amount)) {
    return null;
  }

  return adaptMoneyApi(money);
}

function adaptOptionalTicketsAllowedApi(ticketsAllowed: TicketsAllowedApi | null | undefined): TicketsAllowed | null {
  if (ticketsAllowed === undefined || ticketsAllowed === null) {
    return null;
  }

  return adaptTicketsAllowedApi(ticketsAllowed);
}

function adaptSeatingApi(seating: SeatingApi | null | undefined): Seating | null {
  if (seating === undefined || seating === null) {
    return null;
  }

  return {
    category: seating.category,
    poolId: seating.pool_id ?? null,
    seats: seating.seats ?? [],
  };
}

function adaptSessionTypeApi(sessionType: SessionTypeApi | null | undefined, isSelectedOnce: boolean): SessionType | null {
  if (sessionType === undefined || sessionType === null) {
    return null;
  }

  return {
    addOnCategory: sessionType.add_on_configuration?.category,
    addOnPricingType: sessionType.add_on_configuration?.pricing_type,
    allowedNumTickets: capOptionalTicketsAllowed(adaptOptionalTicketsAllowedApi(sessionType.allowed_num_tickets), isSelectedOnce),
    color: sessionType.color ?? null,
    id: sessionType.id,
    ignoreTimeSlotCapacity: sessionType.ignore_time_slot_capacity ?? false,
    imageUrl: sessionType.image_url ?? null,
    isAddOn: sessionType.is_add_on ?? false,
    isPass: sessionType.is_pass ?? false,
    isShopProduct: sessionType.is_shop_product ?? false,
    isTimeless: sessionType.is_timeless ?? false,
    label: sessionType.label ?? null,
    reservationRestriction: sessionType.reservation_restriction ?? null,
    sorting: sessionType.sorting ?? 0,
    tags: (sessionType.tags ?? []).map(({ id, tag }: SessionTypeTagApi) => ({ id, tag })),
    ticketReceiptLabel: sessionType.ticket_receipt_label ?? null,
    ticketSelectorStepQuantity: isSelectedOnce
      ? DEFAULT_TICKET_SELECTOR_STEP_QUANTITY
      : adaptTicketSelectorStepQuantity(sessionType.ticket_selector_step_quantity),
  };
}

export function adaptSharedAvailabilityBudgetsApi(
  budgets: Record<string, SharedAvailabilityBudgetApi> | null | undefined,
): SharedAvailabilityBudgets {
  const sharedAvailabilityBudgets = new Map<string, { max: number; messageOnFailure: string | null }>();

  for (const [type, budget] of Object.entries(budgets ?? {})) {
    sharedAvailabilityBudgets.set(type, { max: budget.max, messageOnFailure: budget.message_on_failure ?? null });
  }

  return sharedAvailabilityBudgets;
}

function adaptFootprintApi(
  footprint: string[] | null | undefined,
  sharedAvailabilityBudgets: SharedAvailabilityBudgets,
  inlineTypes: ReadonlySet<string>,
): SharedAvailabilityRuleItemType[] {
  return [...new Set(footprint ?? [])].flatMap<SharedAvailabilityRuleItemType>(type => {
    const budget = sharedAvailabilityBudgets.get(type);

    if (budget === undefined || budget.max <= 0 || inlineTypes.has(type)) {
      return [];
    }

    return [
      {
        isCartWide: true,
        max: budget.max,
        messageOnFailure: budget.messageOnFailure,
        messageOnFailureMin: null,
        min: 0,
        quantityMultiplier: null,
        type,
      },
    ];
  });
}

function adaptSharedAvailabilityRuleApi(
  rule: SharedAvailabilityRuleApi | null | undefined,
  footprint: string[] | null | undefined,
  sharedAvailabilityBudgets: SharedAvailabilityBudgets,
): SharedAvailabilityRule | null {
  const inlineItemTypes: SharedAvailabilityRuleItemType[] = (rule?.item_types_sharing_availability_all_of ?? []).map(itemType => ({
    isCartWide: false,
    max: itemType.max,
    messageOnFailure: itemType.message_on_failure ?? null,
    messageOnFailureMin: itemType.message_on_failure_min ?? null,
    min: itemType.min,
    quantityMultiplier: itemType.quantity_multiplier ?? null,
    type: itemType.type,
  }));
  const itemTypesSharingAvailabilityAllOf = [
    ...inlineItemTypes,
    ...adaptFootprintApi(footprint, sharedAvailabilityBudgets, new Set(inlineItemTypes.map(itemType => itemType.type))),
  ];

  if (itemTypesSharingAvailabilityAllOf.length === 0) {
    return null;
  }

  return { itemTypesSharingAvailabilityAllOf };
}

function adaptSessionB2bPricingApi(b2b: SessionB2bPricingApi | null | undefined): B2bPricing | null {
  if (b2b === undefined || b2b === null) {
    return null;
  }

  const wholesalePrice = adaptOptionalMoneyApi(b2b.wholesale_price);
  const discountPercentage = Number(b2b.discount_percentage);

  if (wholesalePrice === null || !Number.isFinite(discountPercentage) || discountPercentage <= 0) {
    return null;
  }

  return { discountPercentage, wholesalePrice };
}

function adaptStrikethroughPriceApi(price: StrikethroughPriceApi | null | undefined): Money | null {
  if (price === undefined || price === null) {
    return null;
  }

  if (price.amount === null || !isUsableWireAmount(price.amount)) {
    return null;
  }

  return { amount: adaptWireAmount(price.amount), currency: price.currency };
}

function adaptTicketSelectorStepQuantity(quantity: number | null | undefined): number {
  if (quantity === undefined || quantity === null) {
    return DEFAULT_TICKET_SELECTOR_STEP_QUANTITY;
  }

  return Number.isInteger(quantity) && quantity > 0 ? quantity : DEFAULT_TICKET_SELECTOR_STEP_QUANTITY;
}

function adaptTicketsAllowedApi(ticketsAllowed: TicketsAllowedApi): TicketsAllowed {
  return { maximum: ticketsAllowed.maximum, minimum: ticketsAllowed.minimum };
}
