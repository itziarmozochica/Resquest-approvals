import { CartAdjustmentPrice } from '../../cart/models/cart-adjustment-price.model';

/**
 * The session type discount an order carries into its modification: the line price entry of each session type, keyed
 * by `sessionTypeDiscountKey(mainPlanId, sessionTypeId)` and re-applied over each line's catalog price. The whole order discount
 * travels as the cart adjustment.
 */
export type SessionTypeDiscounts = ReadonlyMap<string, CartAdjustmentPrice>;
