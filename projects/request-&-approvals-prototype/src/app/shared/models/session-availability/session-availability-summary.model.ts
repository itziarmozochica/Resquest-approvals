import { TicketType } from '../ticket-type/ticket-type.model';
import { RegularSessionAvailabilitySummaryByDate } from './regular-session-availability-summary-by-date.model';
import { SessionAvailability, SessionAvailabilityData } from './session-availability.model';
import { SharedAvailabilityBudgetsData } from './shared-availability-rule.model';

export interface SessionAvailabilitySummaryData {
  allow_multi_session_purchase: boolean;
  date_summaries: Record<
    string,
    {
      datetime_summaries: Record<string, { capacity: number | null; sessions: SessionAvailabilityData[] }>;
    }
  >;
  has_explode_pipe: boolean;
  next_available_date: string;
  product_summaries: SessionAvailabilityData[];
  session_selector_type: string;
  timezone: string;
  shared_availability_budgets?: SharedAvailabilityBudgetsData | null;
}

export class SessionAvailabilitySummary {
  constructor(
    public timezone: string,
    public allowMultiSessionPurchase: boolean,
    public hasExplodePipe: boolean,
    public regularSessionAvailabilitySummaryByDates: RegularSessionAvailabilitySummaryByDate[] = [],
    public nextAvailableDate: string,
    public sessionSelectorType: string,
    public productSessions: SessionAvailability[] = [],
  ) {}

  getProductTypes(): TicketType[] {
    const productTypes: TicketType[] = [];

    this.productSessions.forEach(productSession => {
      const ticketType = new TicketType(
        productSession.name,
        productSession.sessionType?.id,
        productSession.minimumTicketsAllowedPerBooking,
        productSession.maximumTicketsAllowedPerBooking,
        productSession.isPurchasable,
        productSession.isHidden,
        productSession.availableTickets,
        productSession.ticketPrice ?? undefined,
        productSession.surchargePerTicket,
        productSession.id,
        productSession.sessionType?.reservationRestriction,
        undefined,
        productSession.sessionType?.isAddOn,
        undefined,
        productSession.sessionType?.isShopProduct,
        productSession.strikethroughPrice,
        undefined,
        productSession.sessionType?.ticketSelectorStepQuantity ?? 1,
        false,
        undefined,
        undefined,
        productSession.sessionType?.imageUrl,
      );
      productTypes.push(ticketType);
    });

    return this.ticketTypeOrderBy(productTypes);
  }

  getTicketTypes(): TicketType[] {
    const ticketTypes: TicketType[] = [];

    this.regularSessionAvailabilitySummaryByDates.forEach(sessionAvailabilitySummaryByDate => {
      const sessions = sessionAvailabilitySummaryByDate.getArraySessionAvailability();
      sessionAvailabilitySummaryByDate.ticketTypesBySessionId.forEach((ticketTypeName, sessionId) => {
        let ticketType: TicketType = ticketTypes.find(ticketType => ticketType.sessionId === sessionId)!;

        const minAvailabilityByDate = sessionAvailabilitySummaryByDate.minAvailabilityByTicketTypes.get(ticketTypeName)!;
        const maxAvailabilityByDate = sessionAvailabilitySummaryByDate.maxAvailabilityByTicketTypes.get(ticketTypeName)!;
        const minAvailability = ticketType ? ticketType.minimum : minAvailabilityByDate;
        const maxAvailability = ticketType ? ticketType.maximum : maxAvailabilityByDate;

        if (!ticketType) {
          const session = sessions.find(session => session.id === sessionId);
          ticketType = new TicketType(
            ticketTypeName,
            session?.sessionType?.id,
            minAvailability,
            maxAvailability,
            !!session && !session.isDisabled(),
            session?.isHidden,
            session?.availableTickets,
            session?.ticketPrice ?? undefined,
            session?.surchargePerTicket,
            session?.id,
            session?.sessionType?.reservationRestriction,
            session?.sessionType?.ticketReceiptLabel,
            session?.sessionType?.isAddOn,
            session?.details,
            session?.sessionType?.isShopProduct,
            session?.strikethroughPrice,
            undefined,
            session?.sessionType?.ticketSelectorStepQuantity ?? 1,
            false,
            undefined,
            undefined,
            session?.sessionType?.imageUrl,
            session?.sessionType?.tileColor,
          );
          ticketType.sessionId = sessionId;
          ticketTypes.push(ticketType);
        } else {
          if (minAvailabilityByDate !== undefined && minAvailability !== undefined && minAvailabilityByDate < minAvailability) {
            ticketType.minimum = minAvailabilityByDate;
          }
          if (!maxAvailability || maxAvailabilityByDate > maxAvailability) {
            ticketType.maximum = maxAvailabilityByDate;
          }
        }
      });
    });

    return ticketTypes;
  }

  private ticketTypeOrderBy(options: TicketType[]): TicketType[] {
    return options.sort((optionA, optionB) => {
      const optionAWithoutSpecialCharacters = optionA.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const optionBWithoutSpecialCharacters = optionB.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (optionAWithoutSpecialCharacters < optionBWithoutSpecialCharacters) {
        return -1;
      }
      if (optionAWithoutSpecialCharacters > optionBWithoutSpecialCharacters) {
        return 1;
      }
      return 0;
    });
  }
}
