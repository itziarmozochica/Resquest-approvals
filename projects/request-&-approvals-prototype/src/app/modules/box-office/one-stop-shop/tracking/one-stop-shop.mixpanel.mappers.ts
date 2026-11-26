import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { posBreadcrumbsBreadcrumbTapped } from './events/pos-breadcrumbs-breadcrumb-tapped.event';
import { posCartCleared } from './events/pos-cart-cleared.event';
import { posCartItemQuantityChange } from './events/pos-cart-item-quantity-change.event';
import { posCheckoutCashCalcCloseModal } from './events/pos-checkout-cash-calc-close-modal.event';
import { posCheckoutCashCalcShowModal } from './events/pos-checkout-cash-calc-show-modal.event';
import { posCheckoutContactInfoCloseModal } from './events/pos-checkout-contact-info-close-modal.event';
import { posCheckoutContactInfoShowModal } from './events/pos-checkout-contact-info-show-modal.event';
import { posCheckoutMembershipsApplyBenefitsError } from './events/pos-checkout-memberships-apply-benefits-error.event';
import { posCheckoutMembershipsMemberIdentified } from './events/pos-checkout-memberships-member-identified.event';
import { posCheckoutMembershipsMemberRemoved } from './events/pos-checkout-memberships-member-removed.event';
import { posCheckoutPaymentCompleted } from './events/pos-checkout-payment-completed.event';
import { posCheckoutPaymentFailed } from './events/pos-checkout-payment-failed.event';
import { posCheckoutPaymentStarted } from './events/pos-checkout-payment-started.event';
import { posCheckoutPromoCodesCloseModal } from './events/pos-checkout-promo-codes-close-modal.event';
import { posCheckoutPromoCodesFailure } from './events/pos-checkout-promo-codes-failure.event';
import { posCheckoutPromoCodesInteraction } from './events/pos-checkout-promo-codes-interaction.event';
import { posCheckoutPromoCodesOpenManualScanner } from './events/pos-checkout-promo-codes-open-manual-scanner.event';
import { posCheckoutPromoCodesShowModal } from './events/pos-checkout-promo-codes-show-modal.event';
import { posCheckoutPromoCodesSuccess } from './events/pos-checkout-promo-codes-success.event';
import { posCheckoutSelectPaymentMethod } from './events/pos-checkout-select-payment-method.event';
import { posCheckoutShiftCloseModal } from './events/pos-checkout-shift-close-modal.event';
import { posCheckoutShiftShowModal } from './events/pos-checkout-shift-show-modal.event';
import { posConfigDeviceChanged } from './events/pos-config-device-changed.event';
import { posConfigSetupChanged } from './events/pos-config-setup-changed.event';
import { posPartyCategorySelected } from './events/pos-party-category-selected.event';
import { posPartyHourFilterSelected } from './events/pos-party-hour-filter-selected.event';
import { posPartyMemberQuantityChanged } from './events/pos-party-member-quantity-changed.event';
import { posPartyStartTimeTapped } from './events/pos-party-start-time-tapped.event';
import { posPlaceEventSelectorModalClosed } from './events/pos-place-event-selector-modal-closed.event';
import { posPlaceEventSelectorModalOpened } from './events/pos-place-event-selector-modal-opened.event';
import { posProductTileTapped } from './events/pos-product-tile-tapped.event';
import { posSearchClosed } from './events/pos-search-closed.event';
import { posSearchFunction } from './events/pos-search-function.event';
import { posSearchOpened } from './events/pos-search-opened.event';
import { posShiftEnded } from './events/pos-shift-ended.event';
import { posShiftStarted } from './events/pos-shift-started.event';
import { posTabSwitched } from './events/pos-tab-switched.event';
import { posTimeSlotCalendarClosed } from './events/pos-time-slot-calendar-closed.event';
import { posTimeSlotCalendarDateSelected } from './events/pos-time-slot-calendar-date-selected.event';
import { posTimeSlotCalendarOpened } from './events/pos-time-slot-calendar-opened.event';
import { posTimeSlotDatePickerSelected } from './events/pos-time-slot-date-picker-selected.event';
import { posTimeSlotRangeClosed } from './events/pos-time-slot-range-closed.event';
import { posTimeSlotRangeOpened } from './events/pos-time-slot-range-opened.event';
import { posTimeSlotTimeSlotPickerSelected } from './events/pos-time-slot-time-slot-picker-selected.event';

export const oneStopShopMixpanelMappers = mixpanelMapper([
  {
    event: posCartCleared,
    name: 'FZ|POS|Cart|Cleared',
    properties: ({ planId, ...rest }) => ({
      plan_id: planId,
      ...rest,
    }),
  },
  {
    event: posCartItemQuantityChange,
    name: 'FZ|POS|Cart|Item_Qty_Change',
    properties: ({ planId, sessiontypeId, tileType, ...rest }) => ({
      plan_id: planId,
      sessiontype_id: sessiontypeId,
      tile_type: tileType,
      ...rest,
    }),
  },
  {
    event: posCheckoutCashCalcCloseModal,
    name: 'FZ|POS|Checkout|Cash_Calc|Close_Modal',
    properties: ({ toBePaid, ...rest }) => ({
      to_be_paid: toBePaid,
      ...rest,
    }),
  },
  {
    event: posCheckoutCashCalcShowModal,
    name: 'FZ|POS|Checkout|Cash_Calc|Show_Modal',
    properties: ({ toBePaid, ...rest }) => ({
      to_be_paid: toBePaid,
      ...rest,
    }),
  },
  {
    event: posCheckoutContactInfoCloseModal,
    name: 'FZ|POS|Checkout|Contact_Info|Close_Modal',
    properties: ({ filledFields, requiredFields, visibleFields, ...rest }) => ({
      filled_fields: filledFields,
      required_fields: requiredFields,
      visible_fields: visibleFields,
      ...rest,
    }),
  },
  {
    event: posCheckoutContactInfoShowModal,
    name: 'FZ|POS|Checkout|Contact_Info|Show_Modal',
    properties: ({ requiredFields, visibleFields }) => ({
      required_fields: requiredFields,
      visible_fields: visibleFields,
    }),
  },
  {
    event: posCheckoutPaymentCompleted,
    name: 'FZ|POS|Checkout|Payment_Completed',
    properties: ({ itemCount, paymentMethod, planIds, timeslotCount, totalAmount, ...rest }) => ({
      item_count: itemCount,
      payment_method: paymentMethod,
      plan_ids: planIds,
      timeslot_count: timeslotCount,
      total_amount: totalAmount,
      ...rest,
    }),
  },
  {
    event: posCheckoutPaymentFailed,
    name: 'FZ|POS|Checkout|Payment_Failed',
    properties: ({ failureReason, paymentMethod, planIds, ...rest }) => ({
      failure_reason: failureReason,
      payment_method: paymentMethod,
      plan_ids: planIds,
      ...rest,
    }),
  },
  {
    event: posCheckoutPaymentStarted,
    name: 'FZ|POS|Checkout|Payment_Started',
    properties: null,
  },
  {
    event: posCheckoutPromoCodesCloseModal,
    name: 'FZ|POS|Checkout|Promo_Codes|Close_Modal',
    properties: ({ interactionType, selectedPromoCode, ...rest }) => ({
      interaction_type: interactionType,
      selected_promo_code: selectedPromoCode,
      ...rest,
    }),
  },
  {
    event: posCheckoutPromoCodesFailure,
    name: 'FZ|POS|Checkout|Promo_Codes|Failure',
    properties: ({ promoCode, userError, ...rest }) => ({
      promo_code: promoCode,
      user_error: userError,
      ...rest,
    }),
  },
  {
    event: posCheckoutPromoCodesInteraction,
    name: 'FZ|POS|Checkout|Promo_Codes|Interaction',
    properties: ({ availableLazyCouponTypes, interactionType, preselectedCouponCount, preselectedCoupons, ...rest }) => ({
      available_lazy_coupon_types: availableLazyCouponTypes,
      interaction_type: interactionType,
      preselected_coupon_count: preselectedCouponCount,
      preselected_coupons: preselectedCoupons,
      ...rest,
    }),
  },
  {
    event: posCheckoutPromoCodesOpenManualScanner,
    name: 'FZ|POS|Checkout|Promo_Codes|Open_Manual_Scanner',
    properties: null,
  },
  {
    event: posCheckoutPromoCodesShowModal,
    name: 'FZ|POS|Checkout|Promo_Codes|Show_Modal',
    properties: ({ availableLazyCouponTypes, preselectedCouponCount, preselectedCoupons, ...rest }) => ({
      available_lazy_coupon_types: availableLazyCouponTypes,
      preselected_coupon_count: preselectedCouponCount,
      preselected_coupons: preselectedCoupons,
      ...rest,
    }),
  },
  {
    event: posCheckoutPromoCodesSuccess,
    name: 'FZ|POS|Checkout|Promo_Codes|Success',
    properties: ({ promoCode, ...rest }) => ({
      promo_code: promoCode,
      ...rest,
    }),
  },
  {
    event: posCheckoutSelectPaymentMethod,
    name: 'FZ|POS|Checkout|Select_Payment_Method',
    properties: ({
      addonCount,
      availablePaymentMethods,
      itemCount,
      paymentMethod,
      planIds,
      shopProductCount,
      ticketCount,
      timeslotCount,
      totalAmount,
      ...rest
    }) => ({
      addon_count: addonCount,
      available_payment_methods: availablePaymentMethods,
      item_count: itemCount,
      payment_method: paymentMethod,
      plan_ids: planIds,
      shop_product_count: shopProductCount,
      ticket_count: ticketCount,
      timeslot_count: timeslotCount,
      total_amount: totalAmount,
      ...rest,
    }),
  },
  {
    event: posCheckoutShiftCloseModal,
    name: 'FZ|POS|Checkout|Shift|Close_Modal',
    properties: ({ shiftType, ...rest }) => ({
      shift_type: shiftType,
      ...rest,
    }),
  },
  {
    event: posCheckoutShiftShowModal,
    name: 'FZ|POS|Checkout|Shift|Show_Modal',
    properties: ({ shiftType, ...rest }) => ({
      shift_type: shiftType,
      ...rest,
    }),
  },
  {
    event: posProductTileTapped,
    name: 'FZ|POS|Product|Tile_Tapped',
    properties: ({ tileType }) => ({
      tile_type: tileType,
    }),
  },
  {
    event: posTabSwitched,
    name: 'FZ|POS|Tab|Switched',
    properties: ({ fromTab, toTab }) => ({
      from_tab: fromTab,
      to_tab: toTab,
    }),
  },
  {
    event: posSearchOpened,
    name: 'FZ|POS|Search|Opened',
    properties: null,
  },
  {
    event: posSearchFunction,
    name: 'FZ|POS|Search|Search_function',
    properties: ({ resultCount, searchQuery }) => ({
      result_count: resultCount,
      search_query: searchQuery,
    }),
  },
  {
    event: posSearchClosed,
    name: 'FZ|POS|Search|Closed',
    properties: null,
  },
  {
    event: posBreadcrumbsBreadcrumbTapped,
    name: 'FZ|POS|Breadcrumbs|Breadcrumb_Tapped',
    properties: ({ breadcrumbType, ...rest }) => ({
      breadcrumb_type: breadcrumbType,
      ...rest,
    }),
  },
  {
    event: posTimeSlotCalendarOpened,
    name: 'FZ|POS|Time_slot|Calendar_opened',
    properties: null,
  },
  {
    event: posTimeSlotCalendarDateSelected,
    name: 'FZ|POS|Time_slot|Calendar_date_selected',
    properties: ({ selectedDate }) => ({
      selected_date: selectedDate,
    }),
  },
  {
    event: posTimeSlotCalendarClosed,
    name: 'FZ|POS|Time_slot|Calendar_closed',
    properties: null,
  },
  {
    event: posTimeSlotDatePickerSelected,
    name: 'FZ|POS|Time_slot|Date_picker_selected',
    properties: ({ datePickerType, dateSelected }) => ({
      date_picker_type: datePickerType,
      date_selected: dateSelected,
    }),
  },
  {
    event: posTimeSlotRangeOpened,
    name: 'FZ|POS|Time_slot|Range_opened',
    properties: null,
  },
  {
    event: posTimeSlotRangeClosed,
    name: 'FZ|POS|Time_slot|Range_closed',
    properties: null,
  },
  {
    event: posTimeSlotTimeSlotPickerSelected,
    name: 'FZ|POS|Time_slot|Time_slot_picker_selected',
    properties: ({ selectedTimeSlot }) => ({
      selected_time_slot: selectedTimeSlot,
    }),
  },
  {
    event: posPlaceEventSelectorModalOpened,
    name: 'FZ|POS|Place_Event_selector|Modal_opened',
    properties: null,
  },
  {
    event: posPlaceEventSelectorModalClosed,
    name: 'FZ|POS|Place_Event_selector|Modal_closed',
    properties: ({ fromEvent, toEvent, fromPlace, toPlace }) => ({
      from_event: fromEvent,
      to_event: toEvent,
      from_place: fromPlace,
      to_place: toPlace,
    }),
  },
  {
    event: posShiftStarted,
    name: 'FZ|POS|Shift|Started',
    properties: ({ venueId, setupId, cashierId }) => ({
      venue_id: venueId,
      setup_id: setupId,
      cashier_id: cashierId,
    }),
  },
  {
    event: posShiftEnded,
    name: 'FZ|POS|Shift|Ended',
    properties: ({ cashCounted, durationMinutes, transactionCount }) => ({
      cash_counted: cashCounted,
      duration_minutes: durationMinutes,
      transaction_count: transactionCount,
    }),
  },
  {
    event: posConfigSetupChanged,
    name: 'FZ|POS|Config|Setup_Changed',
    properties: ({ fromSetupId, toSetupId }) => ({
      from_setup_id: fromSetupId,
      to_setup_id: toSetupId,
    }),
  },
  {
    event: posCheckoutMembershipsApplyBenefitsError,
    name: 'FZ|POS|Checkout|Memberships|Apply_Benefits_Error',
    properties: ({ failureReason, planIds, ...rest }) => ({
      failure_reason: failureReason,
      plan_ids: planIds,
      ...rest,
    }),
  },
  {
    event: posCheckoutMembershipsMemberIdentified,
    name: 'FZ|POS|Checkout|Memberships|Member_Identified',
    properties: ({ discountsCount, hasPerks }) => ({
      discounts_count: discountsCount,
      has_perks: hasPerks,
    }),
  },
  {
    event: posCheckoutMembershipsMemberRemoved,
    name: 'FZ|POS|Checkout|Memberships|Member_Removed',
    properties: ({ hadPerks }) => ({
      had_perks: hadPerks,
    }),
  },
  {
    event: posConfigDeviceChanged,
    name: 'FZ|POS|Config|Device_Changed',
    properties: ({ fromDeviceId, toDeviceId }) => ({
      from_device_id: fromDeviceId,
      to_device_id: toDeviceId,
    }),
  },
  {
    event: posPartyMemberQuantityChanged,
    name: 'FZ|POS|Party|Member_Quantity_Changed',
    properties: ({ memberName, newQuantity, previousQuantity }) => ({
      member_name: memberName,
      new_quantity: newQuantity,
      previous_quantity: previousQuantity,
    }),
  },
  {
    event: posPartyStartTimeTapped,
    name: 'FZ|POS|Party|Start_Time_Tapped',
    properties: ({ partySize, startTime, tileName }) => ({
      party_size: partySize,
      start_time: startTime,
      tile_name: tileName,
    }),
  },
  {
    event: posPartyHourFilterSelected,
    name: 'FZ|POS|Party|Hour_Filter_Selected',
    properties: null,
  },
  {
    event: posPartyCategorySelected,
    name: 'FZ|POS|Party|Category_Selected',
    properties: null,
  },
]);
