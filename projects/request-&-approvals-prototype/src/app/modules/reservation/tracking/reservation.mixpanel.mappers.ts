import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { DepositSettingsRuleOperatorEnum } from '../models/deposit-settings-rule-operator.enum';
import { DepositSettingsRuleTypeEnum } from '../models/deposit-settings-rule-type.enum';
import { DepositSettingsRule } from '../models/deposit-settings-rule.model';
import { cancelReservation } from './events/cancel-reservation.event';
import { clearAllChanges } from './events/clear-all-changes.event';
import { clickBackToModification } from './events/click-back-to-modification.event';
import { clickCancelPayReservation } from './events/click-cancel-pay-reservation.event';
import { clickClearAddTicketChanges } from './events/click-clear-add-ticket-changes.event';
import { clickClearRescheduleChanges } from './events/click-clear-reschedule-changes.event';
import { clickDiscardUnsavedChanges } from './events/click-discard-unsaved-changes.event';
import { clickEditReservation } from './events/click-edit-reservation.event';
import { clickNewTypeDate } from './events/click-new-type-date.event';
import { clickPayReservation } from './events/click-pay-reservation.event';
import { clickReschedule } from './events/click-reschedule.event';
import { confirmChanges } from './events/confirm-changes.event';
import { depositModifyWarningShown } from './events/deposit-modify-warning-shown.event';
import { depositPaymentCompleted } from './events/deposit-payment-completed.event';
import { depositPaymentFailed } from './events/deposit-payment-failed.event';
import { depositPaymentOptionSelected } from './events/deposit-payment-option-selected.event';
import { depositRefundCompleted } from './events/deposit-refund-completed.event';
import { depositRefundFailed } from './events/deposit-refund-failed.event';
import { depositSettingCreated, DepositSettingCreatedData } from './events/deposit-setting-created.event';
import { depositSettingDeleted, DepositSettingDeletedData } from './events/deposit-setting-deleted.event';
import { depositSettingUpdated } from './events/deposit-setting-updated.event';
import { depositSkipped } from './events/deposit-skipped.event';
import { loadReservationCheckoutScreen } from './events/load-reservation-checkout-screen.event';
import { manualPriceCleared } from './events/manual-price-cleared.event';
import { manualPriceRefused } from './events/manual-price-refused.event';
import { manualPriceSet } from './events/manual-price-set.event';
import { modifyReservationConfirmed } from './events/modify-reservation-confirmed.event';
import { modifyReservationTicketLineDecrement } from './events/modify-reservation-ticket-line-decrement.event';
import { modifyReservationTicketLineIncrement } from './events/modify-reservation-ticket-line-increment.event';
import { modifyReservationTicketLineRemove } from './events/modify-reservation-ticket-line-remove.event';
import { newTypeDateAdded } from './events/new-type-date-added.event';
import { quoteSent } from './events/quote-sent.event';
import { refundDepositClick } from './events/refund-deposit-click.event';
import { reservationCreated } from './events/reservation-created.event';
import { reviewChanges } from './events/review-changes.event';
import { ticketsRescheduled } from './events/tickets-rescheduled.event';
import { viewChanges } from './events/view-changes.event';
import { DepositTrackingContext } from './models/deposit-tracking-context.model';
import { MANUAL_PRICE_ERROR_SCOPE, MANUAL_PRICE_REFUSAL_FAILURE } from './models/manual-price-tracking.model';

const mapDepositContext = ({ currency, depositAmount, depositId, depositStatus, hadPaidDeposit, hasDeposit }: DepositTrackingContext) => ({
  currency,
  deposit_amount: depositAmount,
  deposit_id: depositId,
  deposit_status: depositStatus,
  had_paid_deposit: hadPaidDeposit,
  has_deposit: hasDeposit,
});

const mapDepositSettingRuleProperties = (rules: DepositSettingsRule[]): Record<string, unknown> => {
  const valueOf = (ruleType: DepositSettingsRuleTypeEnum, operator: DepositSettingsRuleOperatorEnum): number | null =>
    rules.find(rule => rule.ruleType === ruleType && rule.operator === operator)?.value ?? null;

  return {
    rule_cart_total_max: valueOf(DepositSettingsRuleTypeEnum.CART_TOTAL, DepositSettingsRuleOperatorEnum.LTE),
    rule_cart_total_min: valueOf(DepositSettingsRuleTypeEnum.CART_TOTAL, DepositSettingsRuleOperatorEnum.GTE),
    rule_ticket_count_max: valueOf(DepositSettingsRuleTypeEnum.TICKET_COUNT, DepositSettingsRuleOperatorEnum.LTE),
    rule_ticket_count_min: valueOf(DepositSettingsRuleTypeEnum.TICKET_COUNT, DepositSettingsRuleOperatorEnum.GTE),
    rules_count: rules.length,
  };
};

const mapDepositSettingEventProperties = ({
  amount,
  channelId,
  depositSettingId,
  paymentWindowHours,
  planId,
  rules,
  termsAndConditionsUrl,
  type,
  warningMessage,
}: DepositSettingCreatedData): Record<string, unknown> => ({
  amount,
  channel_id: channelId,
  deposit_setting_id: depositSettingId,
  payment_window_hours: paymentWindowHours,
  plan_id: planId,
  terms_and_conditions_url: termsAndConditionsUrl,
  type,
  warning_message: warningMessage,
  ...mapDepositSettingRuleProperties(rules),
});

const mapDepositSettingDeletedEventProperties = ({
  amount,
  channelId,
  depositSettingId,
  paymentWindowHours,
  planId,
  termsAndConditionsUrl,
  type,
  warningMessage,
}: DepositSettingDeletedData): Record<string, unknown> => ({
  deposit_setting_id: depositSettingId,
  plan_id: planId,
  ...(amount !== undefined ? { amount } : {}),
  ...(channelId !== undefined ? { channel_id: channelId } : {}),
  ...(paymentWindowHours !== undefined ? { payment_window_hours: paymentWindowHours } : {}),
  ...(termsAndConditionsUrl !== undefined ? { terms_and_conditions_url: termsAndConditionsUrl } : {}),
  ...(type !== undefined ? { type } : {}),
  ...(warningMessage !== undefined ? { warning_message: warningMessage } : {}),
});

export const reservationMixpanelMappers = mixpanelMapper([
  {
    event: reservationCreated,
    name: 'FZ|Reservation|Created',
    properties: ({
      emailProvided,
      hasManualPrices,
      hasOverride,
      itemsCount,
      manualPricedTicketTypes,
      manualReductionTotal,
      overrideAmount,
      overrideOperation,
      overrideType,
      reservationExpirationDate,
      roundingAmount,
      valueWithoutOverride,
      valueWithOverride,
    }) => ({
      email_provided: emailProvided,
      has_manual_prices: hasManualPrices,
      has_override: hasOverride,
      items_count: itemsCount,
      manual_priced_ticket_types: manualPricedTicketTypes,
      manual_reduction_total: manualReductionTotal,
      override_amount: overrideAmount,
      override_operation: overrideOperation,
      override_type: overrideType,
      reservation_expiration_date: reservationExpirationDate,
      rounding_amount: roundingAmount,
      value_with_override: valueWithOverride,
      value_without_override: valueWithoutOverride,
    }),
  },
  // GAME-1722 §10: manual prices per ticket type on the reservation cart.
  {
    event: manualPriceSet,
    name: 'set_manual_price',
    properties: ({ cataloguePrice, hasReason, manualPrice, sessionTypeId, ...rest }) => ({
      catalogue_price: cataloguePrice,
      has_reason: hasReason,
      manual_price: manualPrice,
      session_type_id: sessionTypeId,
      ...rest,
    }),
  },
  {
    event: manualPriceCleared,
    name: 'clear_manual_price',
    properties: ({ sessionTypeId, ...rest }) => ({ session_type_id: sessionTypeId, ...rest }),
  },
  {
    event: manualPriceRefused,
    name: 'error',
    // `error` is project-wide and shaped as in asset-based: `scope` names the area, `type` the kind of failure and `reason` the
    // backend code (the cart status code of the refusal).
    properties: ({ code, ...rest }) => ({
      reason: String(code),
      scope: MANUAL_PRICE_ERROR_SCOPE,
      type: MANUAL_PRICE_REFUSAL_FAILURE,
      ...rest,
    }),
  },
  {
    event: cancelReservation,
    name: 'cancel_reservation',
    properties: ({ businessType, channel, placeId, placeName, planId, planName, reservationId, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      business_type: businessType,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
    }),
  },
  {
    event: loadReservationCheckoutScreen,
    name: 'FZ|Reservation|Checkout|Load',
    properties: ({ cartId, channelId, planId, reservationFlowType, reservationId, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      channel_id: channelId,
      plan_id: planId,
      reservation_flow_type: reservationFlowType,
      reservation_id: reservationId,
    }),
  },
  {
    event: clickEditReservation,
    name: 'ModifyReservation|ClickModify',
    properties: ({ action, businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      action,
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: clickDiscardUnsavedChanges,
    name: 'ModifyReservation|ClickDiscard',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId, screen }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      screen,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: clickBackToModification,
    name: 'ModifyReservation|ClickBackToModification',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: clickNewTypeDate,
    name: 'ModifyReservation|ClickNewTypeDate',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: clickReschedule,
    name: 'ModifyReservation|ClickReschedule',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: newTypeDateAdded,
    name: 'ModifyReservation|NewTypeDateAdded',
    properties: ({
      businessType,
      cartId,
      channel,
      numberOfDatesAdded,
      numberOfTicketsAdded,
      placeId,
      placeName,
      planId,
      planName,
      reservationId,
    }) => ({
      cart_id: cartId,
      channel,
      number_of_dates_added: numberOfDatesAdded,
      number_of_tickets_added: numberOfTicketsAdded,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: clickClearAddTicketChanges,
    name: 'ModifyReservation|ClickClearAddTicketChanges',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: ticketsRescheduled,
    name: 'ModifyReservation|TicketsRescheduled',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: clickClearRescheduleChanges,
    name: 'ModifyReservation|ClickClearRescheduleChanges',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: clearAllChanges,
    name: 'ModifyReservation|ClearAllChanges',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: viewChanges,
    name: 'ModifyReservation|ViewChanges',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: reviewChanges,
    name: 'ModifyReservation|ReviewChanges',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: confirmChanges,
    name: 'ModifyReservation|ConfirmChanges',
    properties: ({ businessType, cartId, channel, placeId, placeName, planId, planName, reservationId }) => ({
      cart_id: cartId,
      channel,
      place_id: placeId,
      place_name: placeName,
      plan_id: planId,
      plan_name: planName,
      reservation_id: reservationId,
      ...(businessType !== undefined ? { business_type: businessType } : {}),
    }),
  },
  {
    event: clickCancelPayReservation,
    name: 'FZ|Reservation|Checkout|Click Back',
    properties: ({ cartId, channelId, paymentOption, planId, reservationFlowType, reservationId, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      channel_id: channelId,
      payment_option: paymentOption,
      plan_id: planId,
      reservation_flow_type: reservationFlowType,
      reservation_id: reservationId,
    }),
  },
  {
    event: clickPayReservation,
    name: 'FZ|Reservation|Checkout|Click Pay',
    properties: ({
      cartId,
      channelId,
      checkoutFlowType,
      paymentMethod,
      paymentOption,
      paymentType,
      planId,
      reservationFlowType,
      reservationId,
    }) => ({
      cart_id: cartId,
      channel_id: channelId,
      checkout_flow_type: checkoutFlowType,
      payment_method: paymentMethod,
      payment_option: paymentOption,
      payment_type: paymentType,
      plan_id: planId,
      reservation_flow_type: reservationFlowType,
      reservation_id: reservationId,
    }),
  },
  {
    event: depositPaymentOptionSelected,
    name: 'FZ|Reservation|Deposit|Payment Option Selected',
    properties: ({ cartId, paymentOption, reservationId, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      payment_option: paymentOption,
      reservation_id: reservationId,
    }),
  },
  {
    event: depositPaymentCompleted,
    name: 'FZ|Reservation|Deposit|Payment Completed',
    properties: ({ cartId, paymentMethod, paymentOption, reservationId, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      payment_method: paymentMethod,
      payment_option: paymentOption,
      reservation_id: reservationId,
    }),
  },
  {
    event: depositPaymentFailed,
    name: 'FZ|Reservation|Deposit|Payment Failed',
    properties: ({ cartId, errorCode, errorStatus, paymentMethod, paymentOption, reservationId, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      error_code: errorCode,
      error_status: errorStatus,
      payment_method: paymentMethod,
      payment_option: paymentOption,
      reservation_id: reservationId,
    }),
  },
  {
    event: depositSkipped,
    name: 'FZ|Reservation|Deposit|Skipped',
    properties: ({ cartId, errorCode, reservationId, result, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      error_code: errorCode,
      reservation_id: reservationId,
      result,
    }),
  },
  {
    event: refundDepositClick,
    name: 'FZ|Reservation|Deposit|Click Refund',
    properties: ({ currency, depositId, paymentMethod, refundedAmount, reservationId }) => ({
      currency,
      deposit_id: depositId,
      payment_method: paymentMethod,
      refunded_amount: refundedAmount,
      reservation_id: reservationId,
    }),
  },
  {
    event: depositRefundCompleted,
    name: 'FZ|Reservation|Deposit|Refund Completed',
    properties: ({ currency, depositId, paymentMethod, refundedAmount, reservationId }) => ({
      currency,
      deposit_id: depositId,
      payment_method: paymentMethod,
      refunded_amount: refundedAmount,
      reservation_id: reservationId,
    }),
  },
  {
    event: depositRefundFailed,
    name: 'FZ|Reservation|Deposit|Refund Failed',
    properties: ({ currency, depositId, errorCode, paymentMethod, refundedAmount, reservationId }) => ({
      currency,
      deposit_id: depositId,
      error_code: errorCode,
      payment_method: paymentMethod,
      refunded_amount: refundedAmount,
      reservation_id: reservationId,
    }),
  },
  {
    event: depositModifyWarningShown,
    name: 'FZ|Reservation|Deposit|Modify Warning Shown',
    properties: ({ cartId, modifyAction, reservationId, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      modify_action: modifyAction,
      reservation_id: reservationId,
    }),
  },
  {
    event: modifyReservationConfirmed,
    name: 'FZ|Reservation|Modify|Confirmed',
    properties: ({ cartId, errorCode, modifyAction, reservationId, result, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      error_code: errorCode,
      modify_action: modifyAction,
      reservation_id: reservationId,
      result,
    }),
  },
  {
    event: modifyReservationTicketLineIncrement,
    name: 'ModifyReservation|ClickIncreaseItem',
    properties: ({ cartId, previousQuantity, quantity, reservationId, sessionId, sessionTypeId, stepQuantity, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      previous_quantity: previousQuantity,
      quantity,
      reservation_id: reservationId,
      session_id: sessionId,
      session_type_id: sessionTypeId,
      step_quantity: stepQuantity,
    }),
  },
  {
    event: modifyReservationTicketLineDecrement,
    name: 'ModifyReservation|ClickDecreaseItem',
    properties: ({ cartId, previousQuantity, quantity, reservationId, sessionId, sessionTypeId, stepQuantity, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      previous_quantity: previousQuantity,
      quantity,
      reservation_id: reservationId,
      session_id: sessionId,
      session_type_id: sessionTypeId,
      step_quantity: stepQuantity,
    }),
  },
  {
    event: modifyReservationTicketLineRemove,
    name: 'ModifyReservation|ClickRemoveItem',
    properties: ({ cartId, previousQuantity, quantity, reservationId, sessionId, sessionTypeId, ...depositContext }) => ({
      ...mapDepositContext(depositContext),
      cart_id: cartId,
      previous_quantity: previousQuantity,
      quantity,
      reservation_id: reservationId,
      session_id: sessionId,
      session_type_id: sessionTypeId,
    }),
  },
  {
    event: depositSettingCreated,
    name: 'FZ|Reservation|DepositSetting|Created',
    properties: mapDepositSettingEventProperties,
  },
  {
    event: depositSettingUpdated,
    name: 'FZ|Reservation|DepositSetting|Updated',
    properties: mapDepositSettingEventProperties,
  },
  {
    event: depositSettingDeleted,
    name: 'FZ|Reservation|DepositSetting|Deleted',
    properties: mapDepositSettingDeletedEventProperties,
  },
  {
    event: quoteSent,
    name: 'send_quote',
    properties: ({ isResend, leadId, quoteId, ...rest }) => ({
      is_resend: isResend,
      lead_id: leadId,
      quote_id: quoteId,
      ...rest,
    }),
  },
]);

const manualPriceEventIds: ReadonlySet<string> = new Set([manualPriceSet.id, manualPriceCleared.id, manualPriceRefused.id]);

/** The manual price events, also sent by the Box Office order modification (GAME-2287). */
export const manualPriceMixpanelMappers = reservationMixpanelMappers.filter(mapper => manualPriceEventIds.has(mapper.id));
