export interface ReservationsCartCardLine {
  readonly id: string;
  readonly name: string;
  readonly price: string;
  readonly quantity: number;
  readonly surchargePerTicket: string | null;
  readonly totalSurchargePerTicket: string | null;
}

export interface ReservationsCartCardView {
  readonly labels: ReservationsCartCardLabels;
  readonly lines: readonly ReservationsCartCardLine[];
  readonly session: ReservationsCartCardSession | null;
  readonly title: string;
  readonly total: string;
  readonly totalLabel: string;
}

export interface ReservationsCartCardSession {
  readonly label: string;
  readonly startsAt: string;
}

export interface ReservationsCartCardLabels {
  readonly surcharge: string;
}
