import { NgModule } from '@angular/core';

import { ClickResellerReportsMapper } from '@fz-original/app/core/tracking/mixpanel/mappers/click-reseller-reports';
import { ClickSearchOrdersMapper } from '@fz-original/app/core/tracking/mixpanel/mappers/click-search-orders';
import { LoadMyReservationListMapper } from '@fz-original/app/core/tracking/mixpanel/mappers/load-my-reservation-list';
import { LoadReservationListMapper } from '@fz-original/app/core/tracking/mixpanel/mappers/load-reservation-list';
import { PartnerCreateReservationRuleMapper } from '@fz-original/app/core/tracking/mixpanel/mappers/partner-create-reservation-rule';
import { PartnerCreatesCustomCapabilitySettings } from '@fz-original/app/core/tracking/mixpanel/mappers/partner-creates-custom-capability-settings';
import { PartnerDeleteReservationRuleMapper } from '@fz-original/app/core/tracking/mixpanel/mappers/partner-delete-reservation-rule';
import { PartnerUpdateReservationRuleMapper } from '@fz-original/app/core/tracking/mixpanel/mappers/partner-update-reservation-rule';
import { RoundingHelpClickMapper } from '@fz-original/app/core/tracking/mixpanel/mappers/rounding-help-click';
import { SendBookingAnswersMapper } from '@fz-original/app/core/tracking/mixpanel/mappers/send-booking-answers';
import { ToggleOverrideModuleMapper } from '@fz-original/app/core/tracking/mixpanel/mappers/toggle-override-module';

import { TrackingEvents } from '../core/tracking-events';
import { MixpanelTrackingMapper } from '../providers/mixpanel/mixpanel-mapper';
import { MixpanelTrackingModule } from '../providers/mixpanel/mixpanel-tracking.module';
import { MIXPANEL_MAPPERS, MixpanelTrackingProvider } from '../providers/mixpanel/mixpanel-tracking.provider';
import { TrackingEvent } from '../tracking-event';
import { AddUserMapper } from './mappers/add-user';
import { ApplyCouponOneStepMapper } from './mappers/apply-coupon-one-step';
import { AttendeeSelectedViewMapper } from './mappers/attendee-select-view';
import { AutoPrintStatusMapper } from './mappers/auto-print-status';
import { BulkInvitationsCancelledMapper } from './mappers/bulk-invitations-cancelled';
import { BulkInvitationsIssuedMapper } from './mappers/bulk-invitations-issued';
import { BulkInvitationsStartedMapper } from './mappers/bulk-invitations-started';
import { CancelExtendTimeSlotMapper } from './mappers/cancel-extend-time-slot';
import { CancelTimeSlotModificationMapper } from './mappers/cancel-time-slot-modification';
import { CartSessionTypeUpgradeAppliedMapper } from './mappers/cart-session-type-upgrade-applied';
import { CartSessionTypeUpgradeShownMapper } from './mappers/cart-session-type-upgrade-shown';
import { CartSessionTypeUpgradeSkippedMapper } from './mappers/cart-session-type-upgrade-skipped';
import { ChangeInsightsTimeSeriesMetricMapper } from './mappers/change-insights-time-series-metric';
import { Click360DashboardsMapper } from './mappers/click-360-dashboards';
import { ClickAddInvitationsMapper } from './mappers/click-add-invitations';
import { ClickAddToCartMapper } from './mappers/click-add-to-cart';
import { ClickApplyCouponMapper } from './mappers/click-apply-coupon';
import { ClickApplyCouponOneStepMapper } from './mappers/click-apply-coupon-one-step';
import { ClickApplyReservationCouponMapper } from './mappers/click-apply-reservation-coupon';
import { ClickAttendeesSeatingMapMapper } from './mappers/click-attendees-seating-map';
import { ClickBackToInsightsSummaryMapper } from './mappers/click-back-to-insights-summary';
import { ClickBoxOfficeMapper } from './mappers/click-box-office';
import { ClickBusinessesMapper } from './mappers/click-businesses';
import { ClickCalendarTimeSlotMapper } from './mappers/click-calendar-time-slot';
import { ClickClearAllCartMapper } from './mappers/click-clear-all-cart';
import { ClickConfirmDeleteSessionRuleMapper } from './mappers/click-confirm-delete-session-rule';
import { ClickConfirmExtendDatesCalendarMapper } from './mappers/click-confirm-extend-dates-calendar';
import { ClickConfirmUnvalidationMapper } from './mappers/click-confirm-unvalidation';
import { ClickContactInformationOneStepMapper } from './mappers/click-contact-information-one-step';
import { ClickCreateExportDashboardBuilderMapper } from './mappers/click-create-export-dashboard-builder';
import { ClickEditSessionRuleMapper } from './mappers/click-edit-session-rule';
import { ClickGetDeliveryNoteMapper } from './mappers/click-get-delivery-note';
import { ClickGoHomeInvitationsMapper } from './mappers/click-go-home-invitations';
import { ClickGoToMakeNewReservationMapper } from './mappers/click-go-to-make-new-reservation';
import { ClickGoToOrderReassignTicketSeatingMapper } from './mappers/click-go-to-order-reassign-ticket-seating';
import { ClickGoToReservationCheckoutMapper } from './mappers/click-go-to-reservation-checkout';
import { ClickGoToReservationDetailsMapper } from './mappers/click-go-to-reservation-details';
import { ClickHelpTopicLinkMapper } from './mappers/click-help-topic-link';
import { ClickInsightsSummaryPlanMapper } from './mappers/click-insights-summary-plan';
import { ClickKioskBookingQuestionsMapper } from './mappers/click-kiosk-booking-questions';
import { ClickKioskCheckoutMapper } from './mappers/click-kiosk-checkout';
import { ClickKioskOrderConfirmationMapper } from './mappers/click-kiosk-order-confirmation';
import { ClickKioskPaymentMapper } from './mappers/click-kiosk-payment';
import { ClickKioskPlanDetailMapper } from './mappers/click-kiosk-plan-detail';
import { ClickKioskTicketingMapper } from './mappers/click-kiosk-ticketing';
import { ClickMakeReservationMapper } from './mappers/click-make-reservation';
import { ClickMarketingServiceContactMapper } from './mappers/click-marketing-service-contact';
import { ClickMarketingServiceMoreInfoMapper } from './mappers/click-marketing-service-more-info';
import { ClickNewConcessionMapper } from './mappers/click-new-concession';
import { ClickNewInvitationsMapper } from './mappers/click-new-invitations';
import { ClickNewOrderMapper } from './mappers/click-new-order';
import { ClickNewSessionRuleMapper } from './mappers/click-new-session-rule';
import { ClickNewSubAffiliateMapper } from './mappers/click-new-sub-affiliate';
import { ClickNotificationsMapper } from './mappers/click-notifications';
import { ClickOnCreateInvitationsMapper } from './mappers/click-on-create-invitations';
import { ClickOnSendInvitationsBulkMapper } from './mappers/click-on-send-invitations-bulk';
import { ClickOnSendInvitationsSingleMapper } from './mappers/click-on-send-invitations-single';
import { ClickOpenExtendTimeSlotMapper } from './mappers/click-open-extend-time-slot';
import { ClickOrderMapper } from './mappers/click-order';
import { ClickOrderPriceListsMapper } from './mappers/click-order-price-lists';
import { ClickOrdersMapper } from './mappers/click-orders';
import { ClickOrdersBulkRescheduleMapper } from './mappers/click-orders-bulk-reschedule';
import { ClickPricePerChannelMapper } from './mappers/click-price-per-channel';
import { ClickPrintOrderKioskMapper } from './mappers/click-print-order-kiosk';
import { ClickPublicationSaveChangesMapper } from './mappers/click-publication-save-changes';
import { ClickReadyForSaleMapper } from './mappers/click-ready-for-sale';
import { ClickRemoveReservationCouponMapper } from './mappers/click-remove-reservation-coupon';
import { ClickReportReviewMapper } from './mappers/click-report-review';
import { ClickReportsMapper } from './mappers/click-reports';
import { ClickReportsSubAffiliateMapper } from './mappers/click-reports-sub-affiliate';
import { ClickResellersMapper } from './mappers/click-resellers';
import { ClickReservationAttendanceArrivedMapper } from './mappers/click-reservation-attendance-arrived';
import { ClickReservationPayMapper } from './mappers/click-reservation-pay';
import { ClickReservationValidateMapper } from './mappers/click-reservation-validate';
import { ClickReservationsMapper } from './mappers/click-reservations';
import { ClickReviewsTabMapper } from './mappers/click-reviews-tab';
import { ClickSalesSummaryMapper } from './mappers/click-sales-summary';
import { ClickSavePriceListsPrioritiesMapper } from './mappers/click-save-price-lists-priorities';
import { ClickSeeRolesMapper } from './mappers/click-see-roles';
import { ClickSessionScheduleMapper } from './mappers/click-session-schedule';
import { ClickSettingsMapper } from './mappers/click-settings';
import { ClickShareB2CSiteMapper } from './mappers/click-share-b2c-site';
import { ClickSplitPackMapper } from './mappers/click-split-pack';
import { ClickTicketsPerTimeslotMapper } from './mappers/click-tickets-per-timeslot';
import { ClickUnvalidateCtaMapper } from './mappers/click-unvalidate-cta';
import { ClickUserReservationsMapper } from './mappers/click-user-reservations';
import { ClickViewDetailsDashboardBuilderMapper } from './mappers/click-view-details-dashboard-builder';
import { ClickViewInFeverMapper } from './mappers/click-view-in-fever';
import { ClickViewQualityIndexBreakdownMapper } from './mappers/click-view-quality-index-breakdown';
import { ClickViewRelatedReviewsMapper } from './mappers/click-view-related-reviews';
import { ClickWhatsappPopupMapper } from './mappers/click-whatsapp-popup';
import { ConfirmBillingDownloadMapper } from './mappers/confirm-billing-download';
import { ConfirmBulkEditSessionsPerTimeslotMapper } from './mappers/confirm-bulk-edit-sessions-per-timeslot';
import { ConfirmCancellationMapper } from './mappers/confirm-cancellation';
import { ConfirmEditCodePoolCapacityMapper } from './mappers/confirm-edit-code-pool-capacity';
import { ConfirmEditCodePoolStatusAndVisibilityMapper } from './mappers/confirm-edit-code-pool-status-and-visibility';
import { ConfirmEditPriceMapper } from './mappers/confirm-edit-price';
import { ConfirmEditSessionMapper } from './mappers/confirm-edit-session';
import { ConfirmEditSessionCapacityMapper } from './mappers/confirm-edit-session-capacity';
import { ConfirmEditTimeSlotStatusAndVisibilityMapper } from './mappers/confirm-edit-time-slot-status-and-visibility';
import { ConfirmEntitlementRescheduleMapper } from './mappers/confirm-entitlement-reschedule';
import { ConfirmExtendTimeSlotMapper } from './mappers/confirm-extend-time-slot';
import { ConfirmIncreaseTicketCapacityMapper } from './mappers/confirm-increase-ticket-capacity';
import { ConfirmOrdersBulkRescheduleMapper } from './mappers/confirm-orders-bulk-reschedule';
import { ConfirmReassignTicketSeatingMapper } from './mappers/confirm-reassign-ticket-seating';
import { ConfirmReportReviewMapper } from './mappers/confirm-report-review';
import { ConfirmStopRestartSessionMapper } from './mappers/confirm-stop-restart-session';
import { ConfirmStopSalesMapper } from './mappers/confirm-stop-sales';
import { ConfirmTimeSlotModificationMapper } from './mappers/confirm-time-slot-modification';
import { ConfirmValidateTicketsMapper } from './mappers/confirm-validate-tickets';
import { ConfirmsRegistrationMapper } from './mappers/confirms-registration';
import { CopyAmbassadorTrackingLinkMapper } from './mappers/copy-ambassador-tracking-link';
import { CopyPaymentLinkMapper } from './mappers/copy-payment-link';
import { CreateBusinessMapper } from './mappers/create-business';
import { CreateChartDashboardBuilderMapper } from './mappers/create-chart-dashboard-builder';
import { CreateCheckoutMapper } from './mappers/create-checkout';
import { CreateConcessionMapper } from './mappers/create-concession';
import { CreateDashboardDashboardBuilderMapper } from './mappers/create-dashboard-dashboard-builder';
import { CreateModifiedOrderMapper } from './mappers/create-modified-order';
import { CreateOrderMapper } from './mappers/create-order';
import { CreateOrderNoteMapper } from './mappers/create-order-note';
import { CreateOnsiteSetupMapper } from './mappers/create-osnite-setup';
import { CreatePriceListMapper } from './mappers/create-price-list';
import { CreateReservationNoteMapper } from './mappers/create-reservation-note';
import { CreateSessionRuleMapper } from './mappers/create-session-rule';
import { CreateSubAffiliateMapper } from './mappers/create-sub-affiliate';
import { CreateTemplateCouponMapper } from './mappers/create-template-coupon';
import { DeactivateUserMapper } from './mappers/deactivate-user';
import { DeleteCashRegisterMapper } from './mappers/delete-cash-register';
import { DeleteExportDashboardBuilderMapper } from './mappers/delete-export-dashboard-builder';
import { DeleteOnsiteSetupMapper } from './mappers/delete-onsite-setup';
import { DeleteOrderNoteMapper } from './mappers/delete-order-note';
import { DeleteReservationNoteMapper } from './mappers/delete-reservation-note';
import { DownloadAttenddeListMapper } from './mappers/download-attendee-list';
import { DownloadCodeListMapper } from './mappers/download-code-list';
import { DownloadOrdersMapper } from './mappers/download-orders';
import { DownloadReservationsMapper } from './mappers/download-reservations';
import { EditBusinessMapper } from './mappers/edit-business';
import { EditBusinessBalanceMapper } from './mappers/edit-business-balance';
import { EditMyBusinessMapper } from './mappers/edit-my-business';
import { EditOrderNoteMapper } from './mappers/edit-order-note';
import { EditPriceListItemPriceMapper } from './mappers/edit-price-list-item-price';
import { EditPriceListSettingsMapper } from './mappers/edit-price-list-settings';
import { EditReservationNoteMapper } from './mappers/edit-reservation-note';
import { EditUserMapper } from './mappers/edit-user';
import { EndShiftMapper } from './mappers/end-shift';
import { ErrorAmbassadorRegisterFormMapper } from './mappers/error-ambassador-register.form';
import { ExpandOrderHistoryCancellationRecordMapper } from './mappers/expand-order-history-cancellation-record';
import { InventoryChangeTabMapper } from './mappers/inventory-change-tab';
import { InventoryNextStepMapper } from './mappers/inventory-next-step';
import { InventoryPreviousStepMapper } from './mappers/inventory-previous-step';
import { InventoryScheduleAddNewMapper } from './mappers/inventory-schedule-add-new';
import { InventoryScheduleCreateExceptionsMapper } from './mappers/inventory-schedule-create-exceptions';
import { InventoryScheduleDefinitionDatesMapper } from './mappers/inventory-schedule-definition-dates';
import { InventoryScheduleEditExceptionsMapper } from './mappers/inventory-schedule-edit-exceptions';
import { InventoryScheduleEditProductsMapper } from './mappers/inventory-schedule-edit-products';
import { InventoryScheduleRemoveProductsMapper } from './mappers/inventory-schedule-remove-products';
import { InventoryScheduleSalesEndTimeMapper } from './mappers/inventory-schedule-sales-end-time';
import { InventoryScheduleSalesStartTimeMapper } from './mappers/inventory-schedule-sales-start-time';
import { InventoryScheduleSaveExistingMapper } from './mappers/inventory-schedule-save-existing';
import { InventoryScheduleSaveNewMapper } from './mappers/inventory-schedule-save-new';
import { InventoryScheduleSeeDetailsMapper } from './mappers/inventory-schedule-see-details';
import { InventoryScheduleTimeSlotRecurrencyMapper } from './mappers/inventory-schedule-time-slot-recurrency';
import { InventoryTicketTypeCreateMapper } from './mappers/inventory-ticket-type-create';
import { InventoryTicketTypeEditMapper } from './mappers/inventory-ticket-type-edit';
import { InventoryTicketTypeGroupCreateMapper } from './mappers/inventory-ticket-type-group-create';
import { InventoryTicketTypeGroupEditMapper } from './mappers/inventory-ticket-type-group-edit';
import { InvitationTrackerActionMapper } from './mappers/invitation-tracker-action';
import { InvitationsBulkCsvClearedMapper } from './mappers/invitations-bulk-csv-cleared';
import { InvitationsBulkCsvPastedMapper } from './mappers/invitations-bulk-csv-pasted';
import { InvitationsBulkModalAcceptedMapper } from './mappers/invitations-bulk-modal-accepted';
import { InvitationsCsvDownloadCompletedMapper } from './mappers/invitations-csv-download-completed';
import { InvitationsCsvDownloadErrorMapper } from './mappers/invitations-csv-download-error';
import { InvitationsLandingSuccessMapper } from './mappers/invitations-landing-success';
import { InvitationsTrackerFiltersAppliedMapper } from './mappers/invitations-tracker-filters-applied';
import { InvitationsTrackerOpenedMapper } from './mappers/invitations-tracker-opened';
import { KioskNeedMoreTimeToScanQrMapper } from './mappers/kiosk-need-more-time-to-scan-qr';
import { KioskPrinterStatusMapper } from './mappers/kiosk-printer-status';
import { KioskTicketDeliveryAutoPrintMapper } from './mappers/kiosk-ticket-delivery-auto-print';
import { KioskTicketDeliveryClickMapper } from './mappers/kiosk-ticket-delivery-click';
import { Load360ReportMapper } from './mappers/load-360-report';
import { LoadAmbassadorProgramDetailMapper } from './mappers/load-ambassador-program-detail';
import { LoadAmbassadorsRegisterPageMapper } from './mappers/load-ambassadors-register-page';
import { LoadAttendeeListMapper } from './mappers/load-attendee-list';
import { LoadBillingMapper } from './mappers/load-billing';
import { LoadBoxOfficeMapper } from './mappers/load-box-office';
import { LoadBulkEditMapper } from './mappers/load-bulk-edit';
import { LoadIncreaseReservationMapper } from './mappers/load-increase-reservation';
import { LoadInsightsMapper } from './mappers/load-insights';
import { LoadInvitationsMapper } from './mappers/load-invitations';
import { LoadKioskMapper } from './mappers/load-kiosk';
import { LoadMakeReservationMapper } from './mappers/load-make-reservation';
import { LoadManageCapacityMapper } from './mappers/load-manage-capacity';
import { LoadMoreRelatedReviewsMapper } from './mappers/load-more-related-reviews';
import { LoadMyAmbassadorProgramsMapper } from './mappers/load-my-ambassador-programs';
import { LoadPlanContentMapper } from './mappers/load-plan-content';
import { LoadPlanDetailMapper } from './mappers/load-plan-detail';
import { LoadPlanListMapper } from './mappers/load-plan-list';
import { LoadPlanVenueEditMapper } from './mappers/load-plan-venue-edit';
import { LoadPricingMapper } from './mappers/load-pricing';
import { LoadReduceReservationMapper } from './mappers/load-reduce-reservation';
import { LoadReportMapper } from './mappers/load-report';
import { LoadRescheduleMapper } from './mappers/load-reschedule';
import { LoadResellerAmbassadorProgramListMapper } from './mappers/load-reseller-ambassador-program-list';
import { LoadResellerPlanListMapper } from './mappers/load-reseller-plan-list';
import { LoadReservationCheckoutMapper } from './mappers/load-reservation-checkout';
import { LoadReservationConfirmationMapper } from './mappers/load-reservation-confirmation';
import { LoadReservationPurchaseConfirmationMapper } from './mappers/load-reservation-purchase-confirmation';
import { LoadReviewsMapper } from './mappers/load-reviews';
import { LoadSessionScheduleListMapper } from './mappers/load-session-schedule-list';
import { LoadTasksListMapper } from './mappers/load-tasks-list';
import { LoadTicketsPerTimeslotMapper } from './mappers/load-tickets-per-timeslot';
import { LoadTimeSlotModificationMapper } from './mappers/load-time-slot-modification';
import { LoginSuccessfulMapper } from './mappers/login-successful';
import { MainPlanRedirectMapper } from './mappers/main-plan-redirect';
import { NavigateInsightsCarouselMapper } from './mappers/navigate-insights-carousel';
import { OnsiteSetupSelectedMapper } from './mappers/onsite-setup-selected';
import { OpenCancellationMapper } from './mappers/open-cancellation';
import { OpenExtendDatesCalendarViewMapper } from './mappers/open-extend-dates-calendar-view';
import { OpenManageCapacityMapper } from './mappers/open-manage-capacity';
import { OpenMarketingCatalogMapper } from './mappers/open-marketing-catalog';
import { OpenOnsiteSettingsMapper } from './mappers/open-onsite-settings';
import { OpenOnsiteSetupModalMapper } from './mappers/open-onsite-setup-modal';
import { OpenPriceListsTabMapper } from './mappers/open-price-lists-tab';
import { OpenPricesPerTimeslotMapper } from './mappers/open-prices-per-timeslot';
import { OpenPricingMapper } from './mappers/open-pricing';
import { OpenReassignTicketSeatingMapper } from './mappers/open-reassign-ticket-seating';
import { OpenSeatingManagementModalMapper } from './mappers/open-seating-management-modal';
import { OpenSessionRulesTabMapper } from './mappers/open-session-rules-tab';
import { OpenShiftDetailMapper } from './mappers/open-shift-detail';
import { OpenTimeSlotsCalendarViewMapper } from './mappers/open-time-slots-calendar-view';
import { OpenValidateTicketsMapper } from './mappers/open-validate-tickets';
import { PlanMoreInfoMapper } from './mappers/plan-more-info';
import { PrepareCartMapper } from './mappers/prepare-cart';
import { PrintShiftDetailMapper } from './mappers/print-shift-detail';
import { PrintValidateMapper } from './mappers/print-validate';
import { ReactivateUserMapper } from './mappers/reactivate-user';
import { RedeemAmbassadorProgramRewardMapper } from './mappers/redeem-ambassador-program-reward';
import { RequestInvitationsMapper } from './mappers/request-invitations';
import { RequestReassignTicketSeatingPaginationMapper } from './mappers/request-reassign-ticket-seating-pagination';
import { RescheduleOrderMapper } from './mappers/reschedule-order';
import { ResendOrderConfirmationEmailMapper } from './mappers/resend-order-confirmation-email';
import { ResendPurchaseConfirmationEmailMapper } from './mappers/resend-purchase-confirmation-email';
import { ReservationBusinessSelectedMapper } from './mappers/reservation-business-selected';
import { ReservationFlowStartedMapper } from './mappers/reservation-flow-started';
import { ReservationPlanSelectedMapper } from './mappers/reservation-plan-selected';
import { ResetUserPasswordMapper } from './mappers/reset-user-password';
import { RestoreGroupPriceOverridesMapper } from './mappers/restore-group-price-overrides';
import { RestoreSinglePriceOverrideMapper } from './mappers/restore-single-price-override';
import { SaveBulkEditMapper } from './mappers/save-bulk-edit';
import { SaveNotificationsMapper } from './mappers/save-notifications';
import { SavePlanVenueEditMapper } from './mappers/save-plan-venue-edit';
import { SavePriceOverrideMapper } from './mappers/save-price-override';
import { SearchOrdersMapper } from './mappers/search-orders';
import { SearchShiftsMapper } from './mappers/search-shifts';
import { SearchUsersMapper } from './mappers/search-users';
import { SearchValidateMapper } from './mappers/search-validate';
import { SeatInfoApiErrorMapper } from './mappers/seat-info-api-error';
import { SeatInfoApiSuccessMapper } from './mappers/seat-info-api-success';
import { SelectAmbassadorRewardMapper } from './mappers/select-ambassador-reward';
import { SelectOptionTypeaheadMapper } from './mappers/select-option-typeahead';
import { SelectPriceListViewMapper } from './mappers/select-price-list-view';
import { SelectTimeSlotCalendarDateMapper } from './mappers/select-time-slot-calendar-date';
import { SendPaymentLinkEmailMapper } from './mappers/send-payment-link-email';
import { SendPlanRequestMapper } from './mappers/send-plan-request';
import { SendWalletPassesMapper } from './mappers/send-wallet-passes';
import { SendWebViewMapper } from './mappers/send-web-view';
import { ShareAmbassadorTrackingLinkMapper } from './mappers/share-ambassador-tracking-link';
import { ShowErrorModalMapper } from './mappers/show-error-modal';
import { CloseNoShiftStartedModalMapper, ShowNoShiftStartedModalMapper } from './mappers/show-no-started-shift-modal';
import { SingleInvitationErrorMapper } from './mappers/single-invitation-error';
import { SingleInvitationIssuedMapper } from './mappers/single-invitation-issued';
import { SingleInvitationStartedMapper } from './mappers/single-invitation-started';
import { SplitPaymentCancellationErrorShownMapper } from './mappers/split-payment-cancellation-error-shown';
import { SplitPaymentCancelledMapper } from './mappers/split-payment-cancelled';
import { SplitPaymentChildCancelFailedMapper } from './mappers/split-payment-child-cancel-failed';
import { SplitPaymentChildCancelSuccessMapper } from './mappers/split-payment-child-cancel-success';
import { SplitPaymentChildCancelledMapper } from './mappers/split-payment-child-cancelled';
import { SplitPaymentChildCompletedMapper } from './mappers/split-payment-child-completed';
import { SplitPaymentChildFailedMapper } from './mappers/split-payment-child-failed';
import { SplitPaymentChildTriggerFailedMapper } from './mappers/split-payment-child-trigger-failed';
import { SplitPaymentChildTriggerSuccessMapper } from './mappers/split-payment-child-trigger-success';
import { SplitPaymentChildTriggeredMapper } from './mappers/split-payment-child-triggered';
import { SplitPaymentCompletedMapper } from './mappers/split-payment-completed';
import { SplitPaymentPollFailedMapper } from './mappers/split-payment-poll-failed';
import { SplitPaymentRetryRefundReceiptMapper } from './mappers/split-payment-retry-refund-receipt';
import { SplitPaymentStartedMapper } from './mappers/split-payment-started';
import { SquareConnectionMapper } from './mappers/square-connection';
import { StartShiftMapper } from './mappers/start-shift';
import { StatusShiftMapper } from './mappers/status-shift';
import { SubmitCreateExportDashboardBuilderMapper } from './mappers/submit-create-export-dashboard-builder';
import { SuccessAmbassadorRegisterFormMapper } from './mappers/success-ambassador-register.form';
import { UpdateCashRegisterMapper } from './mappers/update-cash-register';
import { UpdateContentPlanMapper } from './mappers/update-content-plan';
import { UpdateGalleryPlanMapper } from './mappers/update-gallery-plan';
import { UpdateOnsiteSetupMapper } from './mappers/update-onsite-setup';
import { UpdatePlanDefaultCapacityPerTimeSlotMapper } from './mappers/update-plan-default-capacity-per-time-slot';
import { UpdatePublishedSessionTypesInChannelMapper } from './mappers/update-published-session-types-in-channel';
import { UpdateSessionRuleMapper } from './mappers/update-session-rule';
import { UpdateSessionTypeMapper } from './mappers/update-session-type';
import { UpdateSessionTypeCapacityMapper } from './mappers/update-session-type-capacity';
import { UpdateSessionTypeGroupMapper } from './mappers/update-session-type-group';
import { UpdateTimeslotMapper } from './mappers/update-timeslot';
import { ViewAmbassadorRedeemedRewardDetailMapper } from './mappers/view-ambassador-redeemed-reward-detail';
import { ViewAmbassadorRedeemedRewardsMapper } from './mappers/view-ambassador-redeemed-rewards';
import { ViewAmbassadorRewardsPageMapper } from './mappers/view-ambassador-rewards-page';
import { ViewOrderHistoryMapper } from './mappers/view-order-history';
import { ViewTicketMapper } from './mappers/view-ticket';
import { ExtendedMixpanelTrackingProvider } from './mixpanel-tracking.provider';

type BaseTrackingEventData = Record<string, unknown>;

const MIXPANEL_MAPPERS_MAP = new Map<string, MixpanelTrackingMapper<TrackingEvent<BaseTrackingEventData>>>([
  [TrackingEvents.ConfirmBillingDownload, new ConfirmBillingDownloadMapper()],
  [TrackingEvents.ConfirmStopSales, new ConfirmStopSalesMapper()],
  [TrackingEvents.ConfirmIncreaseTicketCapacity, new ConfirmIncreaseTicketCapacityMapper()],
  [TrackingEvents.ConfirmEditSessionCapacity, new ConfirmEditSessionCapacityMapper()],
  [TrackingEvents.ConfirmEditCodePoolCapacity, new ConfirmEditCodePoolCapacityMapper()],
  [TrackingEvents.ConfirmEditCodePoolStatusAndVisibility, new ConfirmEditCodePoolStatusAndVisibilityMapper()],
  [TrackingEvents.ConfirmStopRestartSession, new ConfirmStopRestartSessionMapper()],
  [TrackingEvents.ConfirmValidateTickets, new ConfirmValidateTicketsMapper()],
  [TrackingEvents.SendPlanRequest, new SendPlanRequestMapper()],
  [TrackingEvents.SaveNotifications, new SaveNotificationsMapper()],
  [TrackingEvents.DownloadAttenddeList, new DownloadAttenddeListMapper()],
  [TrackingEvents.DownloadCodeList, new DownloadCodeListMapper()],
  [TrackingEvents.LoadAttendeeList, new LoadAttendeeListMapper()],
  [TrackingEvents.LoginSuccessful, new LoginSuccessfulMapper()],
  [TrackingEvents.LoadBoxOffice, new LoadBoxOfficeMapper()],
  [TrackingEvents.LoadReschedule, new LoadRescheduleMapper()],
  [TrackingEvents.LoadKiosk, new LoadKioskMapper()],
  [TrackingEvents.LoadBilling, new LoadBillingMapper()],
  [TrackingEvents.LoadInsights, new LoadInsightsMapper()],
  [TrackingEvents.LoadInvitations, new LoadInvitationsMapper()],
  [TrackingEvents.LoadPlanList, new LoadPlanListMapper()],
  [TrackingEvents.LoadPlanContent, new LoadPlanContentMapper()],
  [TrackingEvents.LoadPlanDetail, new LoadPlanDetailMapper()],
  [TrackingEvents.LoadReviews, new LoadReviewsMapper()],
  [TrackingEvents.LoadMakeReservation, new LoadMakeReservationMapper()],
  [TrackingEvents.LoadReduceReservation, new LoadReduceReservationMapper()],
  [TrackingEvents.LoadIncreaseReservation, new LoadIncreaseReservationMapper()],
  [TrackingEvents.PlanMoreInfo, new PlanMoreInfoMapper()],
  [TrackingEvents.OpenPricing, new OpenPricingMapper()],
  [TrackingEvents.OpenCancellation, new OpenCancellationMapper()],
  [TrackingEvents.ConfirmCancellation, new ConfirmCancellationMapper()],
  [TrackingEvents.OpenManageCapacity, new OpenManageCapacityMapper()],
  [TrackingEvents.LoadManageCapacity, new LoadManageCapacityMapper()],
  [TrackingEvents.OpenValidateTickets, new OpenValidateTicketsMapper()],
  [TrackingEvents.ClickReportReview, new ClickReportReviewMapper()],
  [TrackingEvents.ConfirmReportReview, new ConfirmReportReviewMapper()],
  [TrackingEvents.SelectOptionTypeahead, new SelectOptionTypeaheadMapper()],
  [TrackingEvents.ClickViewInFever, new ClickViewInFeverMapper()],
  [TrackingEvents.ClickAddToCart, new ClickAddToCartMapper()],
  [TrackingEvents.ClickClearAllCart, new ClickClearAllCartMapper()],
  [TrackingEvents.PrepareCart, new PrepareCartMapper()],
  [TrackingEvents.CreateModifiedOrder, new CreateModifiedOrderMapper()],
  [TrackingEvents.CreateOrder, new CreateOrderMapper()],
  [TrackingEvents.RequestInvitations, new RequestInvitationsMapper()],
  [TrackingEvents.BulkInvitationsCancelled, new BulkInvitationsCancelledMapper()],
  [TrackingEvents.BulkInvitationsIssued, new BulkInvitationsIssuedMapper()],
  [TrackingEvents.BulkInvitationsStarted, new BulkInvitationsStartedMapper()],
  [TrackingEvents.InvitationsCsvDownloadCompleted, new InvitationsCsvDownloadCompletedMapper()],
  [TrackingEvents.InvitationsCsvDownloadError, new InvitationsCsvDownloadErrorMapper()],
  [TrackingEvents.InvitationsTrackerFiltersApplied, new InvitationsTrackerFiltersAppliedMapper()],
  [TrackingEvents.InvitationsTrackerOpened, new InvitationsTrackerOpenedMapper()],
  [TrackingEvents.SingleInvitationError, new SingleInvitationErrorMapper()],
  [TrackingEvents.SingleInvitationIssued, new SingleInvitationIssuedMapper()],
  [TrackingEvents.SingleInvitationStarted, new SingleInvitationStartedMapper()],
  [TrackingEvents.ClickOnCreateInvitations, new ClickOnCreateInvitationsMapper()],
  [TrackingEvents.ClickOnSendInvitationsSingle, new ClickOnSendInvitationsSingleMapper()],
  [TrackingEvents.ClickOnSendInvitationsBulk, new ClickOnSendInvitationsBulkMapper()],
  [TrackingEvents.InvitationsLandingSuccess, new InvitationsLandingSuccessMapper()],
  [TrackingEvents.InvitationsBulkModalAccepted, new InvitationsBulkModalAcceptedMapper()],
  [TrackingEvents.InvitationsBulkCsvPasted, new InvitationsBulkCsvPastedMapper()],
  [TrackingEvents.InvitationsBulkCsvCleared, new InvitationsBulkCsvClearedMapper()],
  [TrackingEvents.ViewTicket, new ViewTicketMapper()],
  [TrackingEvents.ClickNewOrder, new ClickNewOrderMapper()],
  [TrackingEvents.ClickBoxOffice, new ClickBoxOfficeMapper()],
  [TrackingEvents.ClickSalesSummary, new ClickSalesSummaryMapper()],
  [TrackingEvents.ClickAttendeesSeatingMap, new ClickAttendeesSeatingMapMapper()],
  [TrackingEvents.SeatInfoApiError, new SeatInfoApiErrorMapper()],
  [TrackingEvents.SeatInfoApiSuccess, new SeatInfoApiSuccessMapper()],
  [TrackingEvents.LoadReport, new LoadReportMapper()],
  [TrackingEvents.ClickAddInvitations, new ClickAddInvitationsMapper()],
  [TrackingEvents.ClickNewInvitations, new ClickNewInvitationsMapper()],
  [TrackingEvents.ClickNotifications, new ClickNotificationsMapper()],
  [TrackingEvents.ClickGoHomeInvitations, new ClickGoHomeInvitationsMapper()],
  [TrackingEvents.SearchValidate, new SearchValidateMapper()],
  [TrackingEvents.PrintValidate, new PrintValidateMapper()],
  [TrackingEvents.ClickUnvalidateCta, new ClickUnvalidateCtaMapper()],
  [TrackingEvents.ClickConfirmUnvalidation, new ClickConfirmUnvalidationMapper()],
  [TrackingEvents.OpenMarketingCatalog, new OpenMarketingCatalogMapper()],
  [TrackingEvents.ClickMarketingServiceContact, new ClickMarketingServiceContactMapper()],
  [TrackingEvents.ClickMarketingServiceMoreInfo, new ClickMarketingServiceMoreInfoMapper()],
  [TrackingEvents.ClickSettings, new ClickSettingsMapper()],
  [TrackingEvents.SearchUsers, new SearchUsersMapper()],
  [TrackingEvents.AddUser, new AddUserMapper()],
  [TrackingEvents.DeactivateUser, new DeactivateUserMapper()],
  [TrackingEvents.ReactivateUser, new ReactivateUserMapper()],
  [TrackingEvents.EditUser, new EditUserMapper()],
  [TrackingEvents.ResetUserPassword, new ResetUserPasswordMapper()],
  [TrackingEvents.ClickApplyCoupon, new ClickApplyCouponMapper()],
  [TrackingEvents.ClickApplyReservationCoupon, new ClickApplyReservationCouponMapper()],
  [TrackingEvents.ClickRemoveReservationCoupon, new ClickRemoveReservationCouponMapper()],
  [TrackingEvents.ClickApplyCouponOneStep, new ClickApplyCouponOneStepMapper()],
  [TrackingEvents.ApplyCouponOneStep, new ApplyCouponOneStepMapper()],
  [TrackingEvents.SquareConnection, new SquareConnectionMapper()],
  [TrackingEvents.LoadPricing, new LoadPricingMapper()],
  [TrackingEvents.ConfirmEditPrice, new ConfirmEditPriceMapper()],
  [TrackingEvents.ClickSeeRoles, new ClickSeeRolesMapper()],
  [TrackingEvents.ClickWhatsappPopup, new ClickWhatsappPopupMapper()],
  [TrackingEvents.ShowDetailsInvitation, new InvitationTrackerActionMapper('show_details_invitation')],
  [TrackingEvents.PrintInvitation, new InvitationTrackerActionMapper('print_invitation')],
  [TrackingEvents.ResendInvitation, new InvitationTrackerActionMapper('resend_invitation')],
  [TrackingEvents.CancelInvitation, new InvitationTrackerActionMapper('cancel_invitation')],
  [TrackingEvents.ClickOrders, new ClickOrdersMapper()],
  [TrackingEvents.ClickOrdersBulkReschedule, new ClickOrdersBulkRescheduleMapper()],
  [TrackingEvents.ClickOrder, new ClickOrderMapper()],
  [TrackingEvents.ClickSearchOrders, new ClickSearchOrdersMapper()],
  [TrackingEvents.SearchOrders, new SearchOrdersMapper()],
  [TrackingEvents.SearchShifts, new SearchShiftsMapper()],
  [TrackingEvents.DownloadOrders, new DownloadOrdersMapper()],
  [TrackingEvents.UpdateContentPlan, new UpdateContentPlanMapper()],
  [TrackingEvents.ConfirmEditSession, new ConfirmEditSessionMapper()],
  [TrackingEvents.ClickTicketsPerTimeslot, new ClickTicketsPerTimeslotMapper()],
  [TrackingEvents.LoadTicketsPerTimeslot, new LoadTicketsPerTimeslotMapper()],
  [TrackingEvents.UpdateGalleryPlan, new UpdateGalleryPlanMapper()],
  [TrackingEvents.RescheduleOrder, new RescheduleOrderMapper()],
  [TrackingEvents.ClickBusinesses, new ClickBusinessesMapper()],
  [TrackingEvents.ClickReservations, new ClickReservationsMapper()],
  [TrackingEvents.ClickUserReservations, new ClickUserReservationsMapper()],
  [TrackingEvents.ClickViewDetailsDashboardBuilder, new ClickViewDetailsDashboardBuilderMapper()],
  [TrackingEvents.ClickViewQualityIndexBreakdown, new ClickViewQualityIndexBreakdownMapper()],
  [TrackingEvents.ClickViewRelatedReviews, new ClickViewRelatedReviewsMapper()],
  [TrackingEvents.ClickReadyForSale, new ClickReadyForSaleMapper()],
  [TrackingEvents.ConfirmReassignTicketSeating, new ConfirmReassignTicketSeatingMapper()],
  [TrackingEvents.KioskPrinterStatus, new KioskPrinterStatusMapper()],
  [TrackingEvents.ClickGoToReservationCheckout, new ClickGoToReservationCheckoutMapper()],
  [TrackingEvents.ClickMakeReservation, new ClickMakeReservationMapper()],
  [TrackingEvents.LoadReservationConfirmation, new LoadReservationConfirmationMapper()],
  [TrackingEvents.ClickReservationPay, new ClickReservationPayMapper()],
  [TrackingEvents.LoadReservationCheckout, new LoadReservationCheckoutMapper()],
  [TrackingEvents.LoadReservationPurchaseConfirmation, new LoadReservationPurchaseConfirmationMapper()],
  [TrackingEvents.ClickReports, new ClickReportsMapper()],
  [TrackingEvents.Click360Dashboards, new Click360DashboardsMapper()],
  [TrackingEvents.AttendeeSelectedView, new AttendeeSelectedViewMapper()],
  [TrackingEvents.Load360Report, new Load360ReportMapper()],
  [TrackingEvents.LoadSessionScheduleList, new LoadSessionScheduleListMapper()],
  [TrackingEvents.ClickSessionSchedule, new ClickSessionScheduleMapper()],
  [TrackingEvents.LoadBulkEdit, new LoadBulkEditMapper()],
  [TrackingEvents.SaveBulkEdit, new SaveBulkEditMapper()],
  [TrackingEvents.ClickGoToReservationDetails, new ClickGoToReservationDetailsMapper()],
  [TrackingEvents.ClickPublicationSaveChanges, new ClickPublicationSaveChangesMapper()],
  [TrackingEvents.OpenShiftDetail, new OpenShiftDetailMapper()],
  [TrackingEvents.PrintShiftDetail, new PrintShiftDetailMapper()],
  [TrackingEvents.StartShift, new StartShiftMapper()],
  [TrackingEvents.EndShift, new EndShiftMapper()],
  [TrackingEvents.ClickGetDeliveryNote, new ClickGetDeliveryNoteMapper()],
  [TrackingEvents.ClickResellerReports, new ClickResellerReportsMapper()],
  [TrackingEvents.ClickResellers, new ClickResellersMapper()],
  [TrackingEvents.OpenOnsiteSettings, new OpenOnsiteSettingsMapper()],
  [TrackingEvents.CreateOnsiteSetup, new CreateOnsiteSetupMapper()],
  [TrackingEvents.UpdateOnsiteSetup, new UpdateOnsiteSetupMapper()],
  [TrackingEvents.UpdateCashRegister, new UpdateCashRegisterMapper()],
  [TrackingEvents.DeleteCashRegister, new DeleteCashRegisterMapper()],
  [TrackingEvents.DeleteOnsiteSetup, new DeleteOnsiteSetupMapper()],
  [TrackingEvents.ClickReservationAttendanceArrived, new ClickReservationAttendanceArrivedMapper()],
  [TrackingEvents.ClickReservationValidate, new ClickReservationValidateMapper()],
  [TrackingEvents.UpdateSessionType, new UpdateSessionTypeMapper()],
  [TrackingEvents.DownloadReservations, new DownloadReservationsMapper()],
  [TrackingEvents.OpenPriceListsTab, new OpenPriceListsTabMapper()],
  [TrackingEvents.EditPriceListItemPrice, new EditPriceListItemPriceMapper()],
  [TrackingEvents.EditPriceListSettings, new EditPriceListSettingsMapper()],
  [TrackingEvents.CreatePriceList, new CreatePriceListMapper()],
  [TrackingEvents.ClickGoToMakeNewReservation, new ClickGoToMakeNewReservationMapper()],
  [TrackingEvents.ClickGoToOrderReassignTicketSeating, new ClickGoToOrderReassignTicketSeatingMapper()],
  [TrackingEvents.UpdateSessionTypeCapacity, new UpdateSessionTypeCapacityMapper()],
  [TrackingEvents.UpdatePlanDefaultCapacityPerTimeSlot, new UpdatePlanDefaultCapacityPerTimeSlotMapper()],
  [TrackingEvents.ShowErrorModal, new ShowErrorModalMapper()],
  [TrackingEvents.StatusShift, new StatusShiftMapper()],
  [TrackingEvents.ShowNoShiftStartedModal, new ShowNoShiftStartedModalMapper()],
  [TrackingEvents.CloseNoShiftStartedModal, new CloseNoShiftStartedModalMapper()],
  [TrackingEvents.UpdateTimeslot, new UpdateTimeslotMapper()],
  [TrackingEvents.SendBookingAnswers, new SendBookingAnswersMapper()],
  [TrackingEvents.SendWebView, new SendWebViewMapper()],
  [TrackingEvents.AutoPrintStatus, new AutoPrintStatusMapper()],
  [TrackingEvents.OpenSessionRulesTab, new OpenSessionRulesTabMapper()],
  [TrackingEvents.ClickNewSessionRule, new ClickNewSessionRuleMapper()],
  [TrackingEvents.ClickEditSessionRule, new ClickEditSessionRuleMapper()],
  [TrackingEvents.ClickConfirmDeleteSessionRule, new ClickConfirmDeleteSessionRuleMapper()],
  [TrackingEvents.CreateSessionRule, new CreateSessionRuleMapper()],
  [TrackingEvents.UpdateSessionRule, new UpdateSessionRuleMapper()],
  [TrackingEvents.ConfirmBulkEditSessionsPerTimeslot, new ConfirmBulkEditSessionsPerTimeslotMapper()],
  [TrackingEvents.ConfirmEditTimeSlotStatusAndVisibility, new ConfirmEditTimeSlotStatusAndVisibilityMapper()],
  [TrackingEvents.ConfirmEntitlementReschedule, new ConfirmEntitlementRescheduleMapper()],
  [TrackingEvents.ClickContactInformationOneStep, new ClickContactInformationOneStepMapper()],
  [TrackingEvents.ClickCreateExportDashboardBuilder, new ClickCreateExportDashboardBuilderMapper()],
  [TrackingEvents.KioskNeedMoreTimeToScanQR, new KioskNeedMoreTimeToScanQrMapper()],
  [TrackingEvents.OpenTimeSlotsCalendarView, new OpenTimeSlotsCalendarViewMapper()],
  [TrackingEvents.ClickCalendarTimeSlot, new ClickCalendarTimeSlotMapper()],
  [TrackingEvents.OpenReassignTicketSeating, new OpenReassignTicketSeatingMapper()],
  [TrackingEvents.RequestReassignTicketSeatingPagination, new RequestReassignTicketSeatingPaginationMapper()],
  [TrackingEvents.SelectTimeSlotCalendarDate, new SelectTimeSlotCalendarDateMapper()],
  [TrackingEvents.EditBusiness, new EditBusinessMapper()],
  [TrackingEvents.EditBusinessBalance, new EditBusinessBalanceMapper()],
  [TrackingEvents.EditMyBusiness, new EditMyBusinessMapper()],
  [TrackingEvents.CreateBusiness, new CreateBusinessMapper()],
  [TrackingEvents.CreateOrderNote, new CreateOrderNoteMapper()],
  [TrackingEvents.EditOrderNote, new EditOrderNoteMapper()],
  [TrackingEvents.DeleteOrderNote, new DeleteOrderNoteMapper()],
  [TrackingEvents.CreateReservationNote, new CreateReservationNoteMapper()],
  [TrackingEvents.EditReservationNote, new EditReservationNoteMapper()],
  [TrackingEvents.DeleteReservationNote, new DeleteReservationNoteMapper()],
  [TrackingEvents.CreateTemplateCoupon, new CreateTemplateCouponMapper()],
  [TrackingEvents.ConfirmOrdersBulkReschedule, new ConfirmOrdersBulkRescheduleMapper()],
  [TrackingEvents.CreateCheckout, new CreateCheckoutMapper()],
  [TrackingEvents.CreateChartDashboardBuilder, new CreateChartDashboardBuilderMapper()],
  [TrackingEvents.CreateDashboardDashboardBuilder, new CreateDashboardDashboardBuilderMapper()],
  [TrackingEvents.DeleteExportDashboardBuilder, new DeleteExportDashboardBuilderMapper()],
  [TrackingEvents.SubmitCreateExportDashboardBuilder, new SubmitCreateExportDashboardBuilderMapper()],
  [TrackingEvents.UpdateSessionTypeGroup, new UpdateSessionTypeGroupMapper()],
  [TrackingEvents.OpenPricesPerTimeslot, new OpenPricesPerTimeslotMapper()],
  [TrackingEvents.ClickPricePerChannel, new ClickPricePerChannelMapper()],
  [TrackingEvents.SavePriceOverride, new SavePriceOverrideMapper()],
  [TrackingEvents.RestoreGroupPriceOverrides, new RestoreGroupPriceOverridesMapper()],
  [TrackingEvents.RestoreSinglePriceOverride, new RestoreSinglePriceOverrideMapper()],
  [TrackingEvents.OpenOnsiteSetupModal, new OpenOnsiteSetupModalMapper()],
  [TrackingEvents.OnsiteSetupSelected, new OnsiteSetupSelectedMapper()],
  [TrackingEvents.ClickPrintOrderKiosk, new ClickPrintOrderKioskMapper()],
  [TrackingEvents.ResendOrderConfirmationEmail, new ResendOrderConfirmationEmailMapper()],
  [TrackingEvents.ResendPurchaseConfirmationEmail, new ResendPurchaseConfirmationEmailMapper()],
  [TrackingEvents.SendWalletPasses, new SendWalletPassesMapper()],
  [TrackingEvents.UpdatePublishedSessionTypesInChannel, new UpdatePublishedSessionTypesInChannelMapper()],
  [TrackingEvents.CreateConcession, new CreateConcessionMapper()],
  [TrackingEvents.ClickNewConcession, new ClickNewConcessionMapper()],
  [TrackingEvents.ClickNewSubAffiliate, new ClickNewSubAffiliateMapper()],
  [TrackingEvents.CreateSubAffiliate, new CreateSubAffiliateMapper()],
  [TrackingEvents.ClickReportsSubAffiliate, new ClickReportsSubAffiliateMapper()],
  [TrackingEvents.ClickOrderPriceLists, new ClickOrderPriceListsMapper()],
  [TrackingEvents.ClickSavePriceListsPriorities, new ClickSavePriceListsPrioritiesMapper()],
  [TrackingEvents.KioskTicketDeliveryAutoPrint, new KioskTicketDeliveryAutoPrintMapper()],
  [TrackingEvents.KioskTicketDeliveryClick, new KioskTicketDeliveryClickMapper()],
  [TrackingEvents.CancelExtendTimeSlot, new CancelExtendTimeSlotMapper()],
  [TrackingEvents.ClickOpenExtendTimeSlot, new ClickOpenExtendTimeSlotMapper()],
  [TrackingEvents.ConfirmExtendTimeSlot, new ConfirmExtendTimeSlotMapper()],
  [TrackingEvents.OpenExtendDatesCalendar, new OpenExtendDatesCalendarViewMapper()],
  [TrackingEvents.ClickConfirmExtendDatesCalendar, new ClickConfirmExtendDatesCalendarMapper()],
  [TrackingEvents.OpenSeatingManagementModal, new OpenSeatingManagementModalMapper()],
  [TrackingEvents.LoadAmbassadorsRegisterPage, new LoadAmbassadorsRegisterPageMapper()],
  [TrackingEvents.SuccessAmbassadorRegisterForm, new SuccessAmbassadorRegisterFormMapper()],
  [TrackingEvents.ErrorAmbassadorRegisterForm, new ErrorAmbassadorRegisterFormMapper()],
  [TrackingEvents.ShareAmbassadorTrackingLink, new ShareAmbassadorTrackingLinkMapper()],
  [TrackingEvents.CopyAmbassadorTrackingLink, new CopyAmbassadorTrackingLinkMapper()],
  [TrackingEvents.RedeemAmbassadorProgramReward, new RedeemAmbassadorProgramRewardMapper()],
  [TrackingEvents.ViewAmbassadorRewardsPage, new ViewAmbassadorRewardsPageMapper()],
  [TrackingEvents.ViewAmbassadorRedeemedRewards, new ViewAmbassadorRedeemedRewardsMapper()],
  [TrackingEvents.ViewAmbassadorRedeemedRewardDetail, new ViewAmbassadorRedeemedRewardDetailMapper()],
  [TrackingEvents.SelectAmbassadorReward, new SelectAmbassadorRewardMapper()],
  [TrackingEvents.LoadMoreRelatedReviews, new LoadMoreRelatedReviewsMapper()],
  [TrackingEvents.LoadMyAmbassadorPrograms, new LoadMyAmbassadorProgramsMapper()],
  [TrackingEvents.LoadAmbassadorProgramDetail, new LoadAmbassadorProgramDetailMapper()],
  [TrackingEvents.ConfirmsRegistration, new ConfirmsRegistrationMapper()],
  [TrackingEvents.PartnerCreatesCustomCapabilitySettings, new PartnerCreatesCustomCapabilitySettings()],
  [TrackingEvents.PartnerCreateReservationRule, new PartnerCreateReservationRuleMapper()],
  [TrackingEvents.PartnerUpdateReservationRule, new PartnerUpdateReservationRuleMapper()],
  [TrackingEvents.PartnerDeleteReservationRule, new PartnerDeleteReservationRuleMapper()],
  [TrackingEvents.ClickShareB2CSite, new ClickShareB2CSiteMapper()],
  [TrackingEvents.LoadResellerPlanList, new LoadResellerPlanListMapper()],
  [TrackingEvents.LoadResellerAmbassadorProgramList, new LoadResellerAmbassadorProgramListMapper()],
  [TrackingEvents.ClickKioskPlanDetail, new ClickKioskPlanDetailMapper()],
  [TrackingEvents.ClickKioskTicketing, new ClickKioskTicketingMapper()],
  [TrackingEvents.ClickKioskCheckout, new ClickKioskCheckoutMapper()],
  [TrackingEvents.ClickKioskBookingQuestions, new ClickKioskBookingQuestionsMapper()],
  [TrackingEvents.ClickKioskOrderConfirmation, new ClickKioskOrderConfirmationMapper()],
  [TrackingEvents.ClickKioskPayment, new ClickKioskPaymentMapper()],
  [TrackingEvents.MainPlanRedirect, new MainPlanRedirectMapper()],
  [TrackingEvents.NavigateInsightsCarousel, new NavigateInsightsCarouselMapper()],
  [TrackingEvents.ClickHelpTopicLink, new ClickHelpTopicLinkMapper()],
  [TrackingEvents.ClickInsightsSummaryPlan, new ClickInsightsSummaryPlanMapper()],
  [TrackingEvents.ClickBackToInsightsSummary, new ClickBackToInsightsSummaryMapper()],
  [TrackingEvents.ClickReviewsTab, new ClickReviewsTabMapper()],
  [TrackingEvents.ReservationFlowStarted, new ReservationFlowStartedMapper()],
  [TrackingEvents.ReservationBusinessSelected, new ReservationBusinessSelectedMapper()],
  [TrackingEvents.ReservationPlanSelected, new ReservationPlanSelectedMapper()],
  [TrackingEvents.LoadReservationList, new LoadReservationListMapper()],
  [TrackingEvents.LoadMyReservationList, new LoadMyReservationListMapper()],
  [TrackingEvents.LoadPlanVenueEdit, new LoadPlanVenueEditMapper()],
  [TrackingEvents.SavePlanVenueEdit, new SavePlanVenueEditMapper()],
  [TrackingEvents.ClickSplitPack, new ClickSplitPackMapper()],
  [TrackingEvents.LoadTasksList, new LoadTasksListMapper()],
  [TrackingEvents.ToggleOverrideModule, new ToggleOverrideModuleMapper()],
  [TrackingEvents.RoundingHelpClick, new RoundingHelpClickMapper()],
  [TrackingEvents.CopyPaymentLink, new CopyPaymentLinkMapper()],
  [TrackingEvents.SendPaymentLinkEmail, new SendPaymentLinkEmailMapper()],
  [TrackingEvents.SelectPriceListView, new SelectPriceListViewMapper()],
  [TrackingEvents.LoadTimeSlotModification, new LoadTimeSlotModificationMapper()],
  [TrackingEvents.ConfirmTimeSlotModification, new ConfirmTimeSlotModificationMapper()],
  [TrackingEvents.CancelTimeSlotModification, new CancelTimeSlotModificationMapper()],
  [TrackingEvents.ChangeInsightsTimeSeriesMetric, new ChangeInsightsTimeSeriesMetricMapper()],
  [TrackingEvents.InventoryChangeTab, new InventoryChangeTabMapper()],
  [TrackingEvents.InventoryNextStep, new InventoryNextStepMapper()],
  [TrackingEvents.InventoryPreviousStep, new InventoryPreviousStepMapper()],
  [TrackingEvents.InventoryScheduleAddNew, new InventoryScheduleAddNewMapper()],
  [TrackingEvents.InventoryScheduleCreateExceptions, new InventoryScheduleCreateExceptionsMapper()],
  [TrackingEvents.InventoryScheduleEditExceptions, new InventoryScheduleEditExceptionsMapper()],
  [TrackingEvents.InventoryScheduleDefinitionDates, new InventoryScheduleDefinitionDatesMapper()],
  [TrackingEvents.InventoryScheduleEditProducts, new InventoryScheduleEditProductsMapper()],
  [TrackingEvents.InventoryScheduleRemoveProducts, new InventoryScheduleRemoveProductsMapper()],
  [TrackingEvents.InventoryScheduleSaveExisting, new InventoryScheduleSaveExistingMapper()],
  [TrackingEvents.InventoryScheduleSaveNew, new InventoryScheduleSaveNewMapper()],
  [TrackingEvents.InventoryScheduleSalesEndTime, new InventoryScheduleSalesEndTimeMapper()],
  [TrackingEvents.InventoryScheduleSalesStartTime, new InventoryScheduleSalesStartTimeMapper()],
  [TrackingEvents.InventoryScheduleSeeDetails, new InventoryScheduleSeeDetailsMapper()],
  [TrackingEvents.InventoryScheduleTimeSlotRecurrency, new InventoryScheduleTimeSlotRecurrencyMapper()],
  [TrackingEvents.InventoryTicketTypeCreate, new InventoryTicketTypeCreateMapper()],
  [TrackingEvents.InventoryTicketTypeEdit, new InventoryTicketTypeEditMapper()],
  [TrackingEvents.InventoryTicketTypeGroupCreate, new InventoryTicketTypeGroupCreateMapper()],
  [TrackingEvents.InventoryTicketTypeGroupEdit, new InventoryTicketTypeGroupEditMapper()],
  [TrackingEvents.SplitPaymentStarted, new SplitPaymentStartedMapper()],
  [TrackingEvents.SplitPaymentChildTriggered, new SplitPaymentChildTriggeredMapper()],
  [TrackingEvents.SplitPaymentChildTriggerSuccess, new SplitPaymentChildTriggerSuccessMapper()],
  [TrackingEvents.SplitPaymentChildTriggerFailed, new SplitPaymentChildTriggerFailedMapper()],
  [TrackingEvents.SplitPaymentChildCancelled, new SplitPaymentChildCancelledMapper()],
  [TrackingEvents.SplitPaymentChildCancelSuccess, new SplitPaymentChildCancelSuccessMapper()],
  [TrackingEvents.SplitPaymentChildCancelFailed, new SplitPaymentChildCancelFailedMapper()],
  [TrackingEvents.SplitPaymentChildCompleted, new SplitPaymentChildCompletedMapper()],
  [TrackingEvents.SplitPaymentChildFailed, new SplitPaymentChildFailedMapper()],
  [TrackingEvents.SplitPaymentCancelled, new SplitPaymentCancelledMapper()],
  [TrackingEvents.SplitPaymentCompleted, new SplitPaymentCompletedMapper()],
  [TrackingEvents.SplitPaymentPollFailed, new SplitPaymentPollFailedMapper()],
  [TrackingEvents.SplitPaymentCancellationErrorShown, new SplitPaymentCancellationErrorShownMapper()],
  [TrackingEvents.SplitPaymentRetryRefundReceipt, new SplitPaymentRetryRefundReceiptMapper()],
  [TrackingEvents.ViewOrderHistory, new ViewOrderHistoryMapper()],
  [TrackingEvents.ExpandOrderHistoryCancellationRecord, new ExpandOrderHistoryCancellationRecordMapper()],
  [TrackingEvents.CartSessionTypeUpgradeShown, new CartSessionTypeUpgradeShownMapper()],
  [TrackingEvents.CartSessionTypeUpgradeApplied, new CartSessionTypeUpgradeAppliedMapper()],
  [TrackingEvents.CartSessionTypeUpgradeSkipped, new CartSessionTypeUpgradeSkippedMapper()],
]);

@NgModule({
  imports: [MixpanelTrackingModule],
  providers: [
    ExtendedMixpanelTrackingProvider,
    {
      provide: MixpanelTrackingProvider,
      useExisting: ExtendedMixpanelTrackingProvider,
    },
    {
      provide: MIXPANEL_MAPPERS,
      useValue: MIXPANEL_MAPPERS_MAP,
    },
  ],
})
export class MixpanelTrackingWithMappersModule {}
