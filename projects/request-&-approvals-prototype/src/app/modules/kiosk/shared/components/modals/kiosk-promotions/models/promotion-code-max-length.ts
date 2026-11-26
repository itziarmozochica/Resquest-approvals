/**
 * Maximum length allowed for the generic promotion `code` input, keyed by partner id.
 *
 * Only applies to `validation_method.type: 'user'` promotions, which render through
 * `app-generic-promotion`. Other variants (`promotional_code`, `user_password`) are never capped.
 *
 * Partner ids mirror the precedent documented in
 * `kiosk/components/order-confirmation/order-confirmation.component.ts` (`#optionsByPartners`).
 */
export const PROMOTION_CODE_MAX_LENGTH_BY_PARTNER: Readonly<Record<number, number>> = {
  10536: 10, // Fundació la Caixa — CaixaBank / ImaginBank customers enter the first 10 digits of their card
};
