import { Money } from '../../../../models/money.model';

export class SeatInfo {
  constructor(
    public seatReference: string,
    public seatLabel?: string,
    public displayedLabel?: string,
    /** Price the real-time (OneBox) map reported for this seat; absent on classic maps. */
    public itemPrice?: Money,
  ) {}
}
