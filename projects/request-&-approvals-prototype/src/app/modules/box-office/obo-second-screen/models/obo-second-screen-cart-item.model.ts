import { CartSession } from '../../../../shared/models/cart/cart-session.model';
import { Money } from '../../../../shared/models/money.model';
import { CartUtil, RealTimeSeatCard } from '../../../../shared/utils/cart.util';

export class OboSecondScreenCartSession {
  constructor(
    public units: number,
    public sessionId?: number,
    public name?: string,
    public surchargePerTicket?: Money,
    public totalSurchargePerTicket?: Money,
    public unitPrice?: Money,
    public price?: Money,
    public nameWithoutFormat?: string,
    public seatRow?: string | null,
    public seatNumber?: string | null,
  ) {}

  static from(session: OboSecondScreenCartSession): OboSecondScreenCartSession {
    return new OboSecondScreenCartSession(
      session.units,
      session.sessionId,
      session.name,
      session.surchargePerTicket,
      session.totalSurchargePerTicket,
      session.unitPrice,
      session.price,
      session.nameWithoutFormat,
      session.seatRow,
      session.seatNumber,
    );
  }

  static fromCartSession(cartSession: CartSession): OboSecondScreenCartSession {
    return new OboSecondScreenCartSession(
      cartSession.units,
      cartSession.sessionId,
      cartSession.sessionName,
      cartSession.surchargePerTicket ?? undefined,
      cartSession.totalSurchargePerTicket ?? undefined,
      cartSession.unitPrice ?? undefined,
      cartSession.price ?? undefined,
      cartSession.sessionNameWithoutFormat,
    );
  }

  /** A real-time line becomes one row per seat, named and priced like the cashier's seat cards; any other line stays one row. */
  static rowsFromCartSession(cartSession: CartSession): OboSecondScreenCartSession[] {
    const seatCards = CartUtil.getRealTimeSeatCards(cartSession);
    if (seatCards.length === 0) {
      return [OboSecondScreenCartSession.fromCartSession(cartSession)];
    }
    return seatCards.map((seatCard: RealTimeSeatCard) => {
      const noSurcharge = new Money(0, seatCard.price.currency);
      return new OboSecondScreenCartSession(
        1,
        cartSession.sessionId,
        seatCard.name,
        noSurcharge,
        noSurcharge,
        seatCard.price,
        seatCard.price,
        undefined,
        seatCard.row,
        seatCard.seat,
      );
    });
  }
}
