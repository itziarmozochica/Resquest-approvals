/** `scope` of the project-wide `error` event when the backend refuses the manual prices of a cart (GAME-1722). */
export const MANUAL_PRICE_ERROR_SCOPE = 'manual_price';

/** `type` of that `error` event: a business rejection, as the asset-based screens name it (`server`, `rejected`, `client`). */
export const MANUAL_PRICE_REFUSAL_FAILURE = 'rejected';

/** What the staff member was doing when the backend refused the manual prices of the cart. */
export enum ManualPriceRefusedAction {
  ClearPrice = 'clear_manual_price',
  ModifyOrder = 'modify_order',
  ModifyReservation = 'modify_reservation',
  SetPrice = 'set_manual_price',
  UpdateCart = 'update_cart',
}

/** Screen where a manual price is set or cleared. */
export enum ManualPriceScreen {
  ModifyOrder = 'modify_order',
  ModifyReservation = 'modify_reservation',
  Reservation = 'reservation',
}
