import { computed, inject } from '@angular/core';

import { BulkUpdateSessionTypesAdapter } from '@fz-original/app/shared/services/sessions/bulk-update-session-types.adapter';
import {
  BulkUpdateSessionTypesAcrossPlansResult,
  SessionType,
  SessionTypeBulkEditPropertyValue,
  SessionTypeBulkEditValues,
  SessionTypeGroup,
} from '@fz-original/app/shared/services/sessions/session-type.model';
import { SessionTypeService } from '@fz-original/app/shared/services/sessions/session-type.service';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';

import {
  CrossEventBulkEditPanelStep,
  CrossEventBulkEditPanelStepValue,
  CrossEventBulkEditPlanName,
  crossEventBulkEditPlanSelectionLimit,
  CrossEventBulkEditStoreState,
  crossEventBulkEditTicketTypeSelectionLimit,
  initialState,
} from '../models/store/cross-event-bulk-edit-store.model';
import { remapNeededSessionTypesInValues } from '../utils/cross-event-bulk-edit-needed-session-types.util';
import {
  canContinueFromProperties,
  crossEventBulkEditRestrictedProperties,
  withoutRestrictedProperties,
} from '../utils/cross-event-bulk-edit-properties.util';
import { groupSelectedTicketTypesByPlan, toAcrossPlansRequests } from '../utils/cross-event-bulk-edit-requests.util';

export const CrossEventBulkEditStore = signalStore(
  withState<CrossEventBulkEditStoreState>(initialState),
  withComputed(({ planPublished, selectedPlanIds, selectedProperties, selectedTicketTypeIds, sessionTypes }) => ({
    canContinue: computed(() => selectedPlanIds().length > 0),
    canContinueFromProperties: computed(() => canContinueFromProperties(selectedProperties())),
    canContinueFromTicketTypes: computed(() => selectedTicketTypeIds().length > 0),
    isSelectionFull: computed(() => selectedPlanIds().length >= crossEventBulkEditPlanSelectionLimit),
    isTicketTypeSelectionFull: computed(() => selectedTicketTypeIds().length >= crossEventBulkEditTicketTypeSelectionLimit),
    restrictedProperties: computed(() => {
      const selected = new Set(selectedTicketTypeIds());
      return crossEventBulkEditRestrictedProperties(
        sessionTypes().filter(sessionType => selected.has(sessionType.id)),
        selectedPlanIds().some(planId => planPublished()[planId] === true),
      );
    }),
  })),
  withMethods((store, adapter = inject(BulkUpdateSessionTypesAdapter), sessionTypeService = inject(SessionTypeService)) => ({
    clearPlans(): void {
      patchState(store, {
        panelStep: CrossEventBulkEditPanelStep.ticketTypes,
        selectedPlanIds: [],
        selectedProperties: [],
        selectedTicketTypeIds: [],
        usedSelectAll: false,
        values: {},
      });
    },

    clearTicketTypes(): void {
      patchState(store, {
        panelStep: CrossEventBulkEditPanelStep.ticketTypes,
        selectedProperties: [],
        selectedTicketTypeIds: [],
        values: {},
      });
    },

    deselectPlans(planIds: readonly number[]): void {
      const selectedPlanIds = withoutIds(store.selectedPlanIds(), planIds);
      patchState(store, {
        selectedPlanIds,
        usedSelectAll: selectedPlanIds.length === 0 ? false : store.usedSelectAll(),
      });
    },

    deselectTicketTypes(ticketTypeIds: readonly number[]): void {
      patchState(store, { selectedTicketTypeIds: withoutIds(store.selectedTicketTypeIds(), ticketTypeIds) });
    },

    openWizard(): void {
      patchState(store, {
        isSubmitting: false,
        panelStep: CrossEventBulkEditPanelStep.ticketTypes,
        selectedProperties: [],
        selectedTicketTypeIds: [],
        sessionTypeGroups: [],
        sessionTypePlanIds: {},
        sessionTypes: [],
        submitError: null,
        values: {},
      });
    },

    rememberPlans(plans: readonly CrossEventBulkEditPlanName[]): void {
      if (plans.length === 0) {
        return;
      }

      const planNames = { ...store.planNames() };
      const planOnSale = { ...store.planOnSale() };
      const planPlaceIds = { ...store.planPlaceIds() };
      const planPublished = { ...store.planPublished() };
      for (const plan of plans) {
        planNames[plan.id] = plan.name;
        planOnSale[plan.id] = plan.isOnSale;
        planPlaceIds[plan.id] = plan.placeId;
        planPublished[plan.id] = plan.isPublished;
      }
      patchState(store, { planNames, planOnSale, planPlaceIds, planPublished });
    },

    rememberSessionTypeGroups(sessionTypeGroups: readonly SessionTypeGroup[]): void {
      patchState(store, { sessionTypeGroups: [...sessionTypeGroups] });
    },

    rememberSessionTypePlanIds(sessionTypePlanIds: Readonly<Record<number, number>>): void {
      patchState(store, { sessionTypePlanIds: { ...sessionTypePlanIds } });
    },

    rememberSessionTypes(sessionTypes: readonly SessionType[]): void {
      patchState(store, { sessionTypes: [...sessionTypes] });
    },

    retainTicketTypes(ticketTypeIds: readonly number[]): void {
      const keeping = new Set(ticketTypeIds);
      patchState(store, { selectedTicketTypeIds: store.selectedTicketTypeIds().filter(ticketTypeId => keeping.has(ticketTypeId)) });
    },

    selectPlans(planIds: readonly number[]): void {
      const selectedPlanIds = nextSelection(store.selectedPlanIds(), planIds, crossEventBulkEditPlanSelectionLimit);
      if (selectedPlanIds === null) {
        return;
      }

      patchState(store, { selectedPlanIds, usedSelectAll: true });
    },

    selectTicketTypes(ticketTypeIds: readonly number[]): void {
      const selectedTicketTypeIds = nextSelection(store.selectedTicketTypeIds(), ticketTypeIds, crossEventBulkEditTicketTypeSelectionLimit);
      if (selectedTicketTypeIds === null) {
        return;
      }

      patchState(store, { selectedTicketTypeIds });
    },

    setPanelStep(panelStep: CrossEventBulkEditPanelStepValue): void {
      patchState(store, { panelStep });
    },

    setSelectedProperties(properties: readonly SessionTypeBulkEditPropertyValue[]): void {
      const selected = new Set(store.selectedTicketTypeIds());
      const restrictedProperties = crossEventBulkEditRestrictedProperties(
        store.sessionTypes().filter(sessionType => selected.has(sessionType.id)),
        store.selectedPlanIds().some(planId => store.planPublished()[planId] === true),
      );
      patchState(store, { selectedProperties: withoutRestrictedProperties(properties, restrictedProperties) });
    },

    setValues(values: SessionTypeBulkEditValues): void {
      patchState(store, { values });
    },

    submit(): Observable<BulkUpdateSessionTypesAcrossPlansResult> {
      const sessionTypePlanIds = store.sessionTypePlanIds();
      const requests = toAcrossPlansRequests(groupSelectedTicketTypesByPlan(store.selectedTicketTypeIds(), sessionTypePlanIds), group =>
        adapter.toApi({
          properties: [...store.selectedProperties()],
          sessionTypeIds: [...group.sessionTypeIds],
          values: remapNeededSessionTypesInValues(store.values(), group.planId, store.sessionTypes(), sessionTypePlanIds),
        }),
      );
      if (requests.length === 0) {
        const error = new Error('No mapped ticket types');
        patchState(store, { isSubmitting: false, submitError: error });
        return throwError(() => error);
      }

      patchState(store, { isSubmitting: true, submitError: null });
      return sessionTypeService.bulkUpdateSessionTypesAcrossPlans({ requests }).pipe(
        tap(() => patchState(store, { submitError: null })),
        catchError(error => {
          patchState(store, { submitError: error });
          return throwError(() => error);
        }),
        finalize(() => patchState(store, { isSubmitting: false })),
      );
    },

    togglePlan(planId: number): void {
      const selectedPlanIds = store.selectedPlanIds();
      if (selectedPlanIds.includes(planId)) {
        const nextPlanIds = withoutIds(selectedPlanIds, [planId]);
        patchState(store, {
          selectedPlanIds: nextPlanIds,
          usedSelectAll: nextPlanIds.length === 0 ? false : store.usedSelectAll(),
        });
        return;
      }

      const nextPlanIds = nextSelection(selectedPlanIds, [planId], crossEventBulkEditPlanSelectionLimit);
      if (nextPlanIds === null) {
        return;
      }

      patchState(store, { selectedPlanIds: nextPlanIds });
    },

    toggleTicketType(ticketTypeId: number): void {
      const selectedTicketTypeIds = store.selectedTicketTypeIds();
      if (selectedTicketTypeIds.includes(ticketTypeId)) {
        patchState(store, { selectedTicketTypeIds: withoutIds(selectedTicketTypeIds, [ticketTypeId]) });
        return;
      }

      const nextTicketTypeIds = nextSelection(selectedTicketTypeIds, [ticketTypeId], crossEventBulkEditTicketTypeSelectionLimit);
      if (nextTicketTypeIds === null) {
        return;
      }

      patchState(store, { selectedTicketTypeIds: nextTicketTypeIds });
    },
  })),
);

function nextSelection(current: readonly number[], incoming: readonly number[], limit: number): number[] | null {
  const selected = new Set(current);
  const room = limit - selected.size;
  if (room <= 0) {
    return null;
  }

  const added = incoming.filter(id => !selected.has(id)).slice(0, room);
  if (added.length === 0) {
    return null;
  }

  return [...current, ...added];
}

function withoutIds(current: readonly number[], ids: readonly number[]): number[] {
  const removing = new Set(ids);
  return current.filter(id => !removing.has(id));
}
