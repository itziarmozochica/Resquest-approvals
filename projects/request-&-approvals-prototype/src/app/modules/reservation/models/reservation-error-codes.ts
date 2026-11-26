export const reservationErrorCodes = {
  reservationLimitExceeded: '905',
  reservationNotImplementedForProvider: '859',
} as const;

export type ReservationErrorCodeET = (typeof reservationErrorCodes)[keyof typeof reservationErrorCodes];
