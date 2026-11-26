import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';

import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, concatMap, exhaustMap, from, map, of, pipe, takeWhile, tap, timeout, type Observable } from 'rxjs';

import type { ReplicationModuleCandidate, ReplicationSource } from '../models/immersive-module-replication.model';
import {
  initialState,
  type ImmersiveModuleReplicationStoreState,
  type ModuleReplicationJob,
  type ModuleReplicationState,
  type ModuleReplicationStatus,
  type ModuleResultsGroup,
  type PublishStatus,
  type ReplicationRowStatus,
} from '../models/store/immersive-module-replication-store.model';
import { ImmersiveModuleReplicationService } from '../services/immersive-module-replication.service';
import { parseEditableModuleKey } from '../utils/immersive-layout-general-settings.util';
import { buildReplicationBody } from '../utils/immersive-module-replication-body.util';
import { formatReplicationErrorDetail } from '../utils/immersive-module-replication-error-detail.util';
import { failureFromError, GENERIC_FAILURE } from '../utils/immersive-module-replication-failure.util';
import { parsePlanIds } from '../utils/immersive-module-replication-plan-ids.util';
import { groupReplicationResults, mergeReplicationResults, retryJobsFrom } from '../utils/immersive-module-replication-results.util';
import { deriveApplyStatus } from '../utils/immersive-module-replication-status.util';

const REPLICATION_TIMEOUT_MS = 30_000;

const MODULE_MESSAGE_KEYS: Partial<Record<ModuleReplicationStatus, string>> = {
  forbidden: 'planEdition.immersiveContentPlan.replication.forbiddenModule',
  notSent: 'planEdition.immersiveContentPlan.replication.notSentDescription',
};

export const ImmersiveModuleReplicationStore = signalStore(
  withState<ImmersiveModuleReplicationStoreState>(initialState),
  withComputed(({ isMediaRiskAcknowledged, modules, planIdsInput, selectedModuleIds, source }) => {
    const selectedCandidates = computed<ReplicationModuleCandidate[]>(() => {
      const current = source();
      const selected = new Set(selectedModuleIds());
      return current === null ? [] : current.modules.filter(candidate => selected.has(candidate.id));
    });
    const parsedPlanIds = computed(() => parsePlanIds(planIdsInput(), source()?.planId ?? 0));
    const requiresMediaAcknowledgement = computed(() => selectedCandidates().some(candidate => candidate.hasMediaRisk));
    // A 403 is left out on purpose: Retry cannot fix a permission, so a forbidden module never yields a job.
    const hasFailed = computed(() => retryJobsFrom(modules(), Object.keys(modules())).length > 0);
    const applyStatus = computed<ReplicationRowStatus>(() => deriveApplyStatus(modules()));
    return {
      applyStatus,
      canStart: computed(
        () =>
          selectedModuleIds().length > 0 &&
          parsedPlanIds().ids.length > 0 &&
          (!requiresMediaAcknowledgement() || isMediaRiskAcknowledged()),
      ),
      groupedResultsByModule: computed<ModuleResultsGroup[]>(() =>
        selectedCandidates().map(candidate => {
          const { failure, results, status }: ModuleReplicationState = modules()[candidate.id] ?? {
            planIds: [],
            results: [],
            status: 'pending',
          };
          // A failure only means something while the module is in `error`; the other messages come from the status.
          const moduleFailure = status === 'error' ? failure : undefined;
          return {
            details: (moduleFailure?.errors ?? []).map(formatReplicationErrorDetail).filter(detail => detail !== ''),
            groups: groupReplicationResults(results),
            label: candidate.label,
            messageKey: moduleFailure?.messageKey ?? MODULE_MESSAGE_KEYS[status],
            moduleId: candidate.id,
            status,
          };
        }),
      ),
      hasFailed,
      parsedPlanIds,
      requiresMediaAcknowledgement,
      selectedCandidates,
    };
  }),
  withMethods((store, service = inject(ImmersiveModuleReplicationService)) => {
    function updateModule(moduleId: string, changes: Partial<ModuleReplicationState>): void {
      patchState(store, (state): Pick<ImmersiveModuleReplicationStoreState, 'modules'> => {
        const current: ModuleReplicationState = state.modules[moduleId] ?? { planIds: [], results: [], status: 'pending' };
        return { modules: { ...state.modules, [moduleId]: { ...current, ...changes } } };
      });
    }

    function sendOne(job: ModuleReplicationJob): Observable<ModuleReplicationStatus> {
      updateModule(job.moduleId, { failure: undefined, status: 'sending' });
      const source = store.source();
      const module = source?.layoutModules.find(candidate => candidate.id === job.moduleId);
      if (source === null || source === undefined || module === undefined) {
        updateModule(job.moduleId, { failure: GENERIC_FAILURE, status: 'error' });
        return of('error');
      }
      // The request goes to the base module's URL; a variant's `channel_id` rides in the body.
      const { moduleId } = parseEditableModuleKey(job.moduleId);
      return service.replicateModule(source.partnerId, moduleId, buildReplicationBody(module, source.translations, job.planIds)).pipe(
        timeout(REPLICATION_TIMEOUT_MS),
        map((response): ModuleReplicationStatus => {
          updateModule(job.moduleId, {
            results: mergeReplicationResults(store.modules()[job.moduleId]?.results ?? [], response.results, job.planIds),
            status: 'done',
          });
          return 'done';
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 403) {
            updateModule(job.moduleId, { status: 'forbidden' });
            return of<ModuleReplicationStatus>('forbidden');
          }
          updateModule(job.moduleId, { failure: failureFromError(error), status: 'error' });
          return of<ModuleReplicationStatus>('error');
        }),
      );
    }

    return {
      replicate: rxMethod<readonly ModuleReplicationJob[]>(
        pipe(
          exhaustMap(jobs => {
            for (const { moduleId, planIds } of jobs) {
              updateModule(moduleId, { failure: undefined, planIds, status: 'pending' });
            }
            return from(jobs).pipe(
              concatMap(job => sendOne(job)),
              takeWhile(status => status !== 'forbidden', true),
              // Not `finalize`: a dialog destroyed mid-batch must not mark what it never got to send.
              tap({
                complete: () => {
                  for (const { moduleId } of jobs) {
                    if (store.modules()[moduleId]?.status === 'pending') {
                      updateModule(moduleId, { status: 'notSent' });
                    }
                  }
                },
              }),
            );
          }),
        ),
      ),
      acknowledgeMediaRisk(value: boolean): void {
        patchState(store, { isMediaRiskAcknowledged: value });
      },
      // Only a failed publish can step back: the plan is still unpublished and nothing was applied,
      // so the form is safe to edit. Once the publish is in flight or done there is nothing to undo.
      back(): void {
        if (store.step() !== 'run' || store.publishStatus() !== 'error') {
          return;
        }
        patchState(store, { publishStatus: 'idle', step: 'form' });
      },
      initialize(source: ReplicationSource): void {
        patchState(store, {
          ...initialState,
          selectedModuleIds: source.modules.filter(candidate => candidate.changed).map(candidate => candidate.id),
          source,
        });
      },
      retryFailed(): void {
        this.replicate(retryJobsFrom(store.modules(), store.selectedModuleIds()));
      },
      setPlanIdsInput(raw: string): void {
        patchState(store, { planIdsInput: raw });
      },
      // Every publish status is reported from the run step, which is where its row lives.
      setPublishStatus(publishStatus: PublishStatus): void {
        patchState(store, { publishStatus, step: 'run' });
      },
      start(): void {
        const planIds = store.parsedPlanIds().ids;
        this.replicate(store.selectedModuleIds().map(moduleId => ({ moduleId, planIds })));
      },
      toggleModule(moduleId: string, selected: boolean): void {
        patchState(store, state => ({
          selectedModuleIds: selected ? [...state.selectedModuleIds, moduleId] : state.selectedModuleIds.filter(id => id !== moduleId),
        }));
      },
    };
  }),
);
