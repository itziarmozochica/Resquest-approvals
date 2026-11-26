export interface ReservationSessionItemTicketsAllowedApi {
  maximum: number;
  minimum: number;
}

export interface ReservationSessionItemBreakdownApi {
  count: number;
  is_add_on: boolean;
  session_id: number;
  session_label: string;
  available_tickets?: number;
  ticket_selector_step_quantity?: number;
  tickets_allowed_per_booking?: ReservationSessionItemTicketsAllowedApi;
  tickets_allowed_per_booking_excluding_availability?: ReservationSessionItemTicketsAllowedApi;
}

/** What was booked, per session: the labels and counts the order's own ticket rows do not carry. */
export interface ReservationSessionItem {
  readonly count: number;
  readonly isAddOn: boolean;
  readonly sessionId: number;
  readonly sessionLabel: string;
}

export interface ReservationSessionItemTicketsAllowed {
  readonly maximum: number;
  readonly minimum: number;
  readonly availableTickets?: number;
  readonly ruleMaximum?: number;
  readonly ruleMinimum?: number;
  readonly ticketSelectorStepQuantity?: number;
}
