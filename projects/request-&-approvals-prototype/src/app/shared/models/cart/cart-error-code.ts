/**
 * Backend error code returned when operating on a cart whose status is already `confirmed`
 * (e.g. preparing a cart that was paid meanwhile). Recovering requires discarding and
 * recreating the cart — the purchase can never succeed against the same cart again.
 */
export const invalidCartStatusConfirmedErrorCode = 24080003;
