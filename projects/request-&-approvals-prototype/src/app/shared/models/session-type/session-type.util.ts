import { AddOnCategory, AddOnPricingType, AddOnViewConfigurationType } from '../../services/sessions/session-type.model';
import { User } from '../user/user.model';
import { SessionType, SessionTypeAddOnConfigurationData } from './session-type.model';

// The backend prices these add-ons from the rest of the cart, so they never count as tickets themselves.
const PRICING_TYPES_PRICED_FROM_THE_REST_OF_THE_CART: ReadonlySet<string> = new Set([
  AddOnPricingType.fixedAmountPerIndividualTicket,
  AddOnPricingType.percentageOverBasePrice,
]);

export function isTransactionFeeSessionType(sessionType: SessionType | undefined | null): boolean {
  return sessionType?.addOnConfiguration?.category === AddOnCategory.transactionFee;
}

export function isCancellationInsuranceSessionType(sessionType: SessionType | undefined | null): boolean {
  return sessionType?.addOnConfiguration?.category === AddOnCategory.cancellationInsurance;
}

export function canModifyTicketProtection(user: User | null | undefined): boolean {
  return user?.isStaff() ?? false;
}

export function isAddOnPricedPerIndividualTicket(sessionType: SessionType | undefined | null): boolean {
  return sessionType?.addOnConfiguration?.pricingType === AddOnPricingType.fixedAmountPerIndividualTicket;
}

export function isAddOnPricedFromTheRestOfTheCart(sessionType: SessionType | undefined | null): boolean {
  const pricingType = sessionType?.addOnConfiguration?.pricingType;
  return pricingType !== undefined && PRICING_TYPES_PRICED_FROM_THE_REST_OF_THE_CART.has(pricingType);
}

/**
 * A toggle add-on priced per individual ticket is selected once per purchase, because the backend already charges
 * one unit for every ticket, and the backend allows one percentage add-on per purchase (B2BO-9343). A fixed amount
 * toggle keeps its quantity: partners sell one per ticket.
 */
export function isAddOnSelectedOnce(addOnConfiguration: SessionTypeAddOnConfigurationData | undefined): boolean {
  return (
    (addOnConfiguration?.selector_type === AddOnViewConfigurationType.toggle &&
      addOnConfiguration.pricing_type === AddOnPricingType.fixedAmountPerIndividualTicket) ||
    addOnConfiguration?.pricing_type === AddOnPricingType.percentageOverBasePrice
  );
}
