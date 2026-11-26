export const ExpirationStrategy = {
  RESERVATION_CREATED_AT: 'RESERVATION_CREATED_AT',
  RESERVATIONS_CLOSE_DATE: 'RESERVATIONS_CLOSE_DATE',
} as const;

export type ExpirationStrategy = (typeof ExpirationStrategy)[keyof typeof ExpirationStrategy];
