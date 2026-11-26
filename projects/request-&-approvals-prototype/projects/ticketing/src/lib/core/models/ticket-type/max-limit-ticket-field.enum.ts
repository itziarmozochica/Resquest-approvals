/**
 * Which `TicketType` field caps a row's quantity — ported from feverzone `MaxLimitTicketFieldEnum` (§6.7).
 *
 * The string values are historical: legacy indexed the model with them
 * (`ticketType[this.maxLimitField as keyof TicketType]`), whereas `maxLimit()` switches on the member
 * and accesses the field directly. Do not reintroduce key-indexing off these values.
 */
export enum MaxLimitTicketField {
  AvailableTickets = 'availableTickets',
  Maximum = 'maximum',
}
