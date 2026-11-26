export interface ReservationSessionItemTicketsAllowed {
  maximum: number;
  minimum: number;
  ruleMaximum?: number;
  ruleMinimum?: number;
  availableTickets?: number;
  ticketSelectorStepQuantity?: number;
}
