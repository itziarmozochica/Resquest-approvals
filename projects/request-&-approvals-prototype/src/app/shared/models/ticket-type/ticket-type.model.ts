import { Money } from '../money.model';
import { ReservationRestrictionEnum } from '../session-type/reservation-restriction.enum';

export class TicketType {
  static readonly EXPLODE_PIPE_SEPARATOR = ' | ';
  explodePipeLevelSeparator = TicketType.EXPLODE_PIPE_SEPARATOR;
  overrideAvailableTickets?: number;

  partySizeMinimum = 0;

  constructor(
    public name: string,
    public id?: number,
    public minimum: number = 1,
    public maximum?: number,
    public isPurchasable: boolean = false,
    public isHidden: boolean = false,
    public availableTickets?: number,
    public price?: Money,
    public surchargePerTicket?: Money,
    public sessionId?: number,
    public reservationRestriction?: ReservationRestrictionEnum,
    public ticketReceiptLabel?: string,
    public isAddon: boolean = false,
    public details?: string,
    public isShopProduct: boolean = false,
    public strikethroughPrice?: Money,
    public priceWithDiscount?: Money,
    public stepQuantity: number = 1,
    public isOngoingMultiDay: boolean = false,
    /** Preformatted per-session labels when `isOngoingMultiDay`: this session's own start / end, with time (`lll`). */
    public ongoingMultiDayStartOnLabel?: string,
    public ongoingMultiDayFinishOnLabel?: string,
    public image?: string,
    public tileColor?: string,
  ) {}

  compareWith(ticketType: TicketType): boolean {
    if (!ticketType) {
      return false;
    }
    return (
      this.name === ticketType.name &&
      this.maximum === ticketType.maximum &&
      this.minimum === ticketType.minimum &&
      this.availableTickets === ticketType.availableTickets &&
      this.isHidden === ticketType.isHidden &&
      this.isOngoingMultiDay === ticketType.isOngoingMultiDay &&
      this.isPurchasable === ticketType.isPurchasable &&
      this.price?.amount === ticketType.price?.amount &&
      this.price?.currency === ticketType.price?.currency &&
      this.stepQuantity === ticketType.stepQuantity
    );
  }

  compareWithSessionId(ticketType: TicketType): boolean {
    return (
      this.name === ticketType.name &&
      this.sessionId === ticketType.sessionId &&
      this.maximum === ticketType.maximum &&
      this.minimum === ticketType.minimum &&
      this.availableTickets === ticketType.availableTickets &&
      this.isHidden === ticketType.isHidden &&
      this.isOngoingMultiDay === ticketType.isOngoingMultiDay &&
      this.isPurchasable === ticketType.isPurchasable &&
      this.price?.amount === ticketType.price?.amount &&
      this.price?.currency === ticketType.price?.currency &&
      this.stepQuantity === ticketType.stepQuantity
    );
  }

  getDisplayName(withExplodePipe: boolean): string | undefined {
    if (withExplodePipe) {
      return this.name.split(this.explodePipeLevelSeparator).pop();
    }
    return this.name;
  }

  getPurchasableTicketCount(): number | undefined {
    if (this.availableTickets === undefined || this.maximum === undefined) {
      return undefined;
    }
    return Math.min(this.availableTickets, this.maximum);
  }

  getEffectiveMin(): number {
    return Math.max(this.minimum, this.partySizeMinimum);
  }
}
