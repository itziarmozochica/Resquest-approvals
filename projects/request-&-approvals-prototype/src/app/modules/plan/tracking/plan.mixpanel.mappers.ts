import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { clickBackToEventList } from './events/click-back-to-event-list.event';
import { clickCancelRejectReview } from './events/click-cancel-reject-review.event';
import { clickCloseCreateEventModal } from './events/click-close-create-event-modal.event';
import { clickDuplicatePlan } from './events/click-duplicate-plan.event';
import { clickGoToReporting } from './events/click-go-to-reporting.event';
import { clickOpenCreateEventModal } from './events/click-open-create-event-modal.event';
import { clickPlanCreationBack } from './events/click-plan-creation-back.event';
import { clickPlanCreationContentTab } from './events/click-plan-creation-content-tab.event';
import { clickPlanCreationContinue } from './events/click-plan-creation-continue.event';
import { clickPlanCreationSaveDraft } from './events/click-plan-creation-save-draft.event';
import { clickPlanCreationStepper } from './events/click-plan-creation-stepper.event';
import { clickPlanSetupCard } from './events/click-plan-setup-card.event';
import { clickTakeMeToChannels } from './events/click-take-me-to-channels.event';
import { completePlanCreationContentStep } from './events/complete-plan-creation-content-step.event';
import { confirmApproveReview } from './events/confirm-approve-review.event';
import { confirmClaimReview } from './events/confirm-claim-review.event';
import { confirmRejectReview } from './events/confirm-reject-review.event';
import { confirmReleaseReview } from './events/confirm-release-review.event';
import { confirmSetPlanAsReady } from './events/confirm-set-plan-as-ready.event';
import { confirmSubmitForReview } from './events/confirm-submit-for-review.event';
import { confirmWithdrawSubmission } from './events/confirm-withdraw-submission.event';
import { createEvent } from './events/create-event.event';
import { createNewEvent } from './events/create-new-event.event';
import { createVenuePlaceSelected } from './events/create-venue-place-selected.event';
import { createVenueVenueCreated } from './events/create-venue-venue-created.event';
import { crossEventBulkEditStepCompleted } from './events/cross-event-bulk-edit-step-completed.event';
import { enterInventoryFromPlanCreation } from './events/enter-inventory-from-plan-creation.event';
import { loadPlanCreation } from './events/load-plan-creation.event';
import { loadPlanReview } from './events/load-plan-review.event';
import { planCreationAbandoned } from './events/plan-creation-abandoned.event';
import { planCreationAdvancedSelected } from './events/plan-creation-advanced-selected.event';
import { quickSetupContentSaved } from './events/quick-setup-content-saved.event';
import { quickSetupInventorySaved } from './events/quick-setup-inventory-saved.event';
import { quickSetupPreviewConfirmed } from './events/quick-setup-preview-confirmed.event';
import { quickSetupPreviewReturnToSchedule } from './events/quick-setup-preview-return-to-schedule.event';
import { quickSetupScheduleContinue } from './events/quick-setup-schedule-continue.event';
import { quickSetupSelected } from './events/quick-setup-selected.event';
import { saveMainPlanSettings } from './events/save-main-plan-settings.event';
import { successDuplicatePlan } from './events/success-duplicate-plan.event';
import { CrossEventBulkEditTrackingStep } from './models/cross-event-bulk-edit-tracking.model';
import { duplicatePlanFlow } from './models/plan-tracking.model';

function withoutUndefinedValues(properties: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

export const planMixpanelMappers = mixpanelMapper([
  {
    event: loadPlanCreation,
    name: 'FZ|Events|PlanCreation|LoadPlanCreation',
    properties: null,
  },
  {
    event: clickPlanCreationBack,
    name: 'FZ|Events|PlanCreation|ClickPlanCreationBack',
    properties: null,
  },
  {
    event: clickPlanCreationContentTab,
    name: 'FZ|Events|PlanCreation|ClickPlanCreationContentTab',
    properties: null,
  },
  {
    event: clickPlanCreationContinue,
    name: 'FZ|Events|PlanCreation|ClickPlanCreationContinue',
    properties: null,
  },
  {
    event: clickPlanCreationSaveDraft,
    name: 'FZ|Events|PlanCreation|ClickPlanCreationSaveDraft',
    properties: null,
  },
  {
    event: clickPlanCreationStepper,
    name: 'FZ|Events|PlanCreation|ClickPlanCreationStepper',
    properties: null,
  },
  {
    event: clickPlanSetupCard,
    name: 'FZ|Events|PlanCreation|ClickPlanSetupCard',
    properties: null,
  },
  {
    event: completePlanCreationContentStep,
    name: 'FZ|Events|PlanCreation|CompletePlanCreationContentStep',
    properties: null,
  },
  {
    event: enterInventoryFromPlanCreation,
    name: 'FZ|Events|PlanCreation|EnterInventoryFromPlanCreation',
    properties: null,
  },
  {
    event: planCreationAdvancedSelected,
    name: 'FZ|Events|PlanCreation|AdvancedSelected',
    properties: null,
  },
  {
    event: clickOpenCreateEventModal,
    name: 'FZ|Events|ClickOpenCreateEventModal',
    properties: null,
  },
  {
    event: clickCloseCreateEventModal,
    name: 'FZ|Events|ClickCloseCreateEventModal',
    properties: null,
  },
  {
    event: createEvent,
    name: 'FZ|Events|CreateEvent',
    properties: ({ eventType, flow, informationRequestId, isResume, planId, source }) => ({
      creation_flow: flow,
      event_type: eventType,
      plan_id: planId,
      ...(informationRequestId !== undefined ? { information_request_id: informationRequestId } : {}),
      ...(isResume !== undefined ? { is_resume: isResume } : {}),
      ...(source !== undefined ? { source } : {}),
    }),
  },
  {
    event: createVenuePlaceSelected,
    name: 'FZ|Events|CreateVenue|PlaceSelected',
    properties: ({
      creationFlow,
      placeAddress,
      placeCity,
      placeCountry,
      placeGooglePlaceId,
      placeLatitude,
      placeLongitude,
      placeName,
      placeRegion,
      placeZipCode,
      ...rest
    }) => ({
      ...rest,
      creation_flow: creationFlow,
      place_address: placeAddress,
      place_city: placeCity,
      place_country: placeCountry,
      place_google_place_id: placeGooglePlaceId,
      place_latitude: placeLatitude,
      place_longitude: placeLongitude,
      place_name: placeName,
      place_region: placeRegion,
      place_zip_code: placeZipCode,
    }),
  },
  {
    event: createVenueVenueCreated,
    name: 'FZ|Events|CreateVenue|VenueCreated',
    properties: ({
      creationFlow,
      venueAddress,
      venueCityName,
      venueGooglePlaceId,
      venueId,
      venueLatitude,
      venueLongitude,
      venueName,
      venueZipCode,
    }) => ({
      creation_flow: creationFlow,
      venue_address: venueAddress,
      venue_city_name: venueCityName,
      venue_google_place_id: venueGooglePlaceId,
      venue_id: venueId,
      venue_latitude: venueLatitude,
      venue_longitude: venueLongitude,
      venue_name: venueName,
      venue_zip_code: venueZipCode,
    }),
  },
  {
    event: createNewEvent,
    name: 'FZ|Events|ClickCreateEventEntry',
    properties: null,
  },
  {
    event: clickDuplicatePlan,
    name: 'duplicate_plan_click',
    properties: ({ planId, source }) => ({
      creation_flow: duplicatePlanFlow,
      plan_id: planId,
      source,
    }),
  },
  {
    event: successDuplicatePlan,
    name: 'duplicate_plan_success',
    properties: ({ duplicatedPlanId, planId, source }) => ({
      creation_flow: duplicatePlanFlow,
      duplicated_plan_id: duplicatedPlanId,
      plan_id: planId,
      source,
    }),
  },
  {
    event: loadPlanReview,
    name: 'FZ|PlanReview|LoadPlanReview',
    properties: null,
  },
  {
    event: confirmSetPlanAsReady,
    name: 'FZ|PlanReview|ConfirmSetPlanAsReady',
    properties: null,
  },
  {
    event: clickBackToEventList,
    name: 'FZ|PlanReview|ClickBackToEventList',
    properties: null,
  },
  {
    event: confirmReleaseReview,
    name: 'FZ|PlanReview|ConfirmReleaseReview',
    properties: null,
  },
  {
    event: confirmApproveReview,
    name: 'FZ|PlanReview|ConfirmApproveReview',
    properties: null,
  },
  {
    event: confirmClaimReview,
    name: 'FZ|PlanReview|ConfirmClaimReview',
    properties: null,
  },
  {
    event: confirmRejectReview,
    name: 'FZ|PlanReview|ConfirmRejectReview',
    properties: null,
  },
  {
    event: clickTakeMeToChannels,
    name: 'FZ|PlanReview|ClickTakeMeToChannels',
    properties: null,
  },
  {
    event: clickGoToReporting,
    name: 'FZ|Events|ReportingBanner|ClickGoToReporting',
    properties: null,
  },
  {
    event: confirmWithdrawSubmission,
    name: 'FZ|PlanReview|ConfirmWithdrawSubmission',
    properties: null,
  },
  {
    event: clickCancelRejectReview,
    name: 'FZ|PlanReview|ClickCancelRejectReview',
    properties: null,
  },
  {
    event: confirmSubmitForReview,
    name: 'FZ|PlanReview|ConfirmSubmitForReview',
    properties: null,
  },
  {
    event: quickSetupSelected,
    name: 'FZ|Events|QuickSetup|Selected',
    properties: null,
  },
  {
    event: planCreationAbandoned,
    name: 'FZ|Events|PlanCreation|Abandoned',
    properties: ({ creationFlow, lastStepReached, planId }) => ({
      creation_flow: creationFlow,
      last_step_reached: lastStepReached,
      ...(planId !== undefined ? { plan_id: planId } : {}),
    }),
  },
  {
    event: quickSetupContentSaved,
    name: 'FZ|Events|QuickSetup|ContentSaved',
    properties: null,
  },
  {
    event: quickSetupInventorySaved,
    name: 'FZ|Events|QuickSetup|InventorySaved',
    properties: null,
  },
  {
    event: quickSetupScheduleContinue,
    name: 'FZ|Events|QuickSetup|ScheduleContinue',
    properties: null,
  },
  {
    event: quickSetupPreviewConfirmed,
    name: 'FZ|Events|QuickSetup|PreviewConfirmed',
    properties: null,
  },
  {
    event: quickSetupPreviewReturnToSchedule,
    name: 'FZ|Events|QuickSetup|PreviewReturnToSchedule',
    properties: null,
  },
  {
    event: crossEventBulkEditStepCompleted,
    name: 'step_completed',
    properties: data => {
      if (data.step === CrossEventBulkEditTrackingStep.selectEvents) {
        return {
          events_count: data.eventsCount,
          on_sale_events_count: data.onSaleEventsCount,
          step: data.step,
          used_select_all: data.usedSelectAll,
          venues_count: data.venuesCount,
        };
      }

      if (data.step === CrossEventBulkEditTrackingStep.selectProducts) {
        return {
          product_groups_count: data.productGroupsCount,
          products_count: data.productsCount,
          spelling_suggestions_accepted: data.spellingSuggestionsAccepted,
          step: data.step,
        };
      }

      return {
        properties: data.properties,
        properties_count: data.propertiesCount,
        step: data.step,
      };
    },
  },
  {
    event: saveMainPlanSettings,
    name: 'FZ|Event Settings|Save',
    properties: ({
      allowTicketCancellations,
      calendarSelector,
      continuousTimeSelector,
      denyPublishingInOta,
      disallowIndexing,
      hasPriceListPricing,
      hoursBeforeSessionCancellationNotAllowed,
      mustUseTaxBase,
      overrideCapacityLimit,
      planId,
      planName,
      requestGeneralReview,
      selectorSettingType,
      sessionSelectorType,
      transportEnabled,
      transportExternalEventId,
      transportProviderId,
      validationMethod,
      validationWindow,
      ...rest
    }) =>
      withoutUndefinedValues({
        ...rest,
        allow_ticket_cancellations: allowTicketCancellations,
        calendar_selector: calendarSelector,
        continuous_time_selector: continuousTimeSelector,
        deny_publishing_in_ota: denyPublishingInOta,
        disallow_indexing: disallowIndexing,
        has_price_list_pricing: hasPriceListPricing,
        hours_before_session_cancellation_not_allowed: hoursBeforeSessionCancellationNotAllowed,
        must_use_tax_base: mustUseTaxBase,
        override_capacity_limit: overrideCapacityLimit,
        plan_id: planId,
        plan_name: planName,
        request_general_review: requestGeneralReview,
        selector_setting_type: selectorSettingType,
        session_selector_type: sessionSelectorType,
        transport_enabled: transportEnabled,
        transport_external_event_id: transportExternalEventId,
        transport_provider_id: transportProviderId,
        validation_method: validationMethod,
        validation_window: validationWindow,
      }),
  },
]);
