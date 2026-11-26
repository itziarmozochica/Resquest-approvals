import { computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, setEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  concatMap,
  defer,
  EMPTY,
  exhaustMap,
  finalize,
  forkJoin,
  map,
  mergeMap,
  Observable,
  of,
  pipe,
  scan,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';

import { PartnerService } from '../../../shared/services/partner/partner.service';
import { SessionTypeCatalogItem } from '../../../shared/services/sessions/session-type-catalog.model';
import { SessionTypesCatalogService } from '../../../shared/services/sessions/session-types-catalog.service';
import { Permissions } from '../../../shared/services/user/permissions';
import { UserService } from '../../../shared/services/user/user.service';
import { AgreementRequirement } from '../models/agreement-requirement.model';
import { CreateItem } from '../models/create-item.model';
import { NewRequirement } from '../models/new-requirement.model';
import { RequirementDraft } from '../models/requirement-draft.model';
import { RequirementError } from '../models/requirement-error.model';
import { RequirementFailure } from '../models/requirement-failure.model';
import { RequirementPatch } from '../models/requirement-patch.model';
import { initialState, type AgreementRequirementsState, type ListState } from '../models/store/agreement-requirements-store.model';
import { isScreenLevelError, mapError } from '../utils/map-error.util';
import { setError, setPending, setSuccess } from '../utils/request-state.util';
import { AgreementRequirementsService } from './agreement-requirements.service';

const MISSING_PARTNER_ERROR: RequirementError = { kind: 'unknown', message: 'errors.generic' };

type ItemOutcome = { kind: 'ok'; row: AgreementRequirement } | ({ kind: 'failed' } & RequirementFailure);

export const AgreementRequirementsStore = signalStore(
  withEntities<AgreementRequirement>(),
  withState<AgreementRequirementsState>(initialState),
  withComputed(store => {
    const userService = inject(UserService);
    const permissionsRevision = toSignal(userService.permissions$.pipe(scan(revision => revision + 1, 0)), { initialValue: 0 });
    const canManage = computed(() => {
      permissionsRevision();
      return userService.hasPermission(Permissions.CAN_CREATE_PLANS) || userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS);
    });
    return {
      canCreate: canManage,
      canEdit: canManage,
      isMutating: computed(() => store.pendingMutations() > 0),
      listState: computed<ListState>(() => {
        if (store.error() != null) {
          return 'error';
        }
        if (store.isLoading()) {
          return 'loading';
        }
        return store.hasLoaded() ? 'loaded' : 'idle';
      }),
    };
  }),
  withMethods(
    (
      store,
      service = inject(AgreementRequirementsService),
      sessionTypesService = inject(SessionTypesCatalogService),
      partnerService = inject(PartnerService),
    ) => {
      const ticketTypesCache = new Map<string, SessionTypeCatalogItem[]>();
      const planChanged$ = new Subject<void>();
      let loadEpoch = 0;

      const itemKey = (agreementId: string, sessionTypeId: number | null): string => `${agreementId}|${sessionTypeId}`;
      const entityKey = (requirement: AgreementRequirement): string =>
        itemKey(requirement.agreementId, requirement.scope.kind === 'ticketType' ? requirement.scope.sessionTypeId : null);
      const catalogKey = (partnerId: number, planId: number): string => `${partnerId}|${planId}`;

      const isCurrentEpoch = (epoch: number): boolean => epoch === loadEpoch;

      const startMutation = (): void => {
        patchState(store, { lastMutationError: null, mutationAction: null, pendingMutations: store.pendingMutations() + 1 });
      };
      const endMutation = (): void => {
        patchState(store, { pendingMutations: Math.max(0, store.pendingMutations() - 1) });
      };

      const stopToggling = (id: number): void => {
        const ids = store.togglingIds();
        const index = ids.indexOf(id);
        if (index === -1) {
          return;
        }
        patchState(store, { togglingIds: [...ids.slice(0, index), ...ids.slice(index + 1)] });
      };

      const expand = (draft: RequirementDraft): CreateItem[] => {
        const items =
          draft.scope.kind === 'plan'
            ? draft.agreementIds.map((agreementId): CreateItem => ({ agreementId, sessionTypeId: null }))
            : draft.scope.sessionTypeIds.flatMap(sessionTypeId => draft.agreementIds.map(agreementId => ({ agreementId, sessionTypeId })));
        const seen = new Set<string>();
        return items.filter(item => {
          const key = itemKey(item.agreementId, item.sessionTypeId);
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      };

      const toNewRequirement = (draft: RequirementDraft, mainPlanId: number, item: CreateItem): NewRequirement => ({
        agreementId: item.agreementId,
        coverageRule: draft.coverageRule,
        mainPlanId,
        sessionTypeId: item.sessionTypeId,
        signerRole: draft.signerRole,
        translations: draft.translations,
      });

      const finalizeBatch = (ok: AgreementRequirement[], failed: RequirementFailure[]): void => {
        patchState(store, setEntities(ok), { lastBatchResult: { failed, ok }, mutationAction: 'batchDone' });
      };

      const failMutation = (error: RequirementError): void => {
        patchState(store, { lastMutationError: error, mutationAction: 'mutationError' });
      };

      const runBatch = (draft: RequirementDraft): Observable<unknown> => {
        const partnerId = partnerService.getPartner()?.id;
        const planId = store.planId();
        if (partnerId == null || planId == null) {
          failMutation(MISSING_PARTNER_ERROR);
          return EMPTY;
        }
        const items = expand(draft);
        const existing = new Set(store.entities().map(entityKey));
        const duplicateFailures: RequirementFailure[] = items
          .filter(item => existing.has(itemKey(item.agreementId, item.sessionTypeId)))
          .map(item => ({ error: { kind: 'duplicate' }, isScreenLevel: false, item }));
        const fresh = items.filter(item => !existing.has(itemKey(item.agreementId, item.sessionTypeId)));
        if (fresh.length === 0) {
          finalizeBatch([], duplicateFailures);
          return EMPTY;
        }
        return forkJoin(
          fresh.map(item =>
            service.create(partnerId, toNewRequirement(draft, planId, item)).pipe(
              map((row): ItemOutcome => ({ kind: 'ok', row })),
              catchError((error: unknown) =>
                of<ItemOutcome>({ error: mapError(error), isScreenLevel: isScreenLevelError(error), item, kind: 'failed' }),
              ),
            ),
          ),
        ).pipe(
          tap(outcomes => {
            const ok: AgreementRequirement[] = [];
            const apiFailures: RequirementFailure[] = [];
            for (const outcome of outcomes) {
              if (outcome.kind === 'ok') {
                ok.push(outcome.row);
              } else {
                apiFailures.push({ error: outcome.error, isScreenLevel: outcome.isScreenLevel, item: outcome.item });
              }
            }
            finalizeBatch(ok, [...duplicateFailures, ...apiFailures]);
          }),
          catchError((error: unknown) => {
            failMutation(mapError(error));
            return EMPTY;
          }),
        );
      };

      const fetchList = rxMethod<{ planId: number }>(
        pipe(
          switchMap(({ planId }) => {
            const partnerId = partnerService.getPartner()?.id;
            if (partnerId == null) {
              patchState(store, setError(MISSING_PARTNER_ERROR), { listAction: 'loadError' });
              return EMPTY;
            }
            patchState(store, setPending(), { listAction: null });
            return service.list(partnerId, planId).pipe(
              tap(rows => {
                patchState(store, setSuccess(), setAllEntities(rows), { hasLoaded: true, listAction: 'loadSuccess' });
              }),
              catchError((error: unknown) => {
                patchState(store, setError(error), { listAction: 'loadError' });
                return EMPTY;
              }),
            );
          }),
        ),
      );

      const fetchTicketTypes = rxMethod<number>(
        pipe(
          switchMap(planId => {
            const partnerId = partnerService.getPartner()?.id;
            if (partnerId == null) {
              patchState(store, { isLoadingTicketTypes: false, ticketTypes: [], ticketTypesError: MISSING_PARTNER_ERROR });
              return EMPTY;
            }
            const cached = ticketTypesCache.get(catalogKey(partnerId, planId));
            if (cached !== undefined) {
              patchState(store, { isLoadingTicketTypes: false, ticketTypes: cached, ticketTypesError: null });
              return EMPTY;
            }
            patchState(store, { isLoadingTicketTypes: true, ticketTypes: [], ticketTypesError: null });
            return sessionTypesService.getSessionTypesCatalog(partnerId, planId).pipe(
              tap(items => {
                ticketTypesCache.set(catalogKey(partnerId, planId), items);
                patchState(store, { isLoadingTicketTypes: false, ticketTypes: items });
              }),
              catchError((error: unknown) => {
                patchState(store, { isLoadingTicketTypes: false, ticketTypesError: error });
                return EMPTY;
              }),
            );
          }),
        ),
      );

      return {
        createBatch: rxMethod<RequirementDraft>(
          pipe(
            map(draft => ({ draft, epoch: loadEpoch })),
            exhaustMap(({ draft, epoch }) =>
              defer(() => {
                if (!isCurrentEpoch(epoch)) {
                  return EMPTY;
                }
                startMutation();
                patchState(store, { lastBatchResult: null });
                return runBatch(draft).pipe(
                  takeUntil(planChanged$),
                  finalize(() => endMutation()),
                );
              }).pipe(
                catchError((error: unknown) => {
                  failMutation(mapError(error));
                  endMutation();
                  return EMPTY;
                }),
              ),
            ),
          ),
        ),
        setActive: rxMethod<{ active: boolean; id: number }>(
          pipe(
            map(input => ({ ...input, epoch: loadEpoch })),
            mergeMap(({ active, epoch, id }) =>
              defer(() => {
                if (!isCurrentEpoch(epoch)) {
                  return EMPTY;
                }
                const partnerId = partnerService.getPartner()?.id;
                patchState(store, { lastMutationError: null, mutationAction: null, togglingIds: [...store.togglingIds(), id] });
                if (partnerId == null) {
                  failMutation(MISSING_PARTNER_ERROR);
                  stopToggling(id);
                  return EMPTY;
                }
                return service.setActive(partnerId, id, active).pipe(
                  tap(row => {
                    patchState(store, updateEntity({ changes: { active: row.active, updatedAt: row.updatedAt }, id }), {
                      mutationAction: 'toggleSuccess',
                    });
                  }),
                  catchError((error: unknown) => {
                    failMutation(mapError(error));
                    return EMPTY;
                  }),
                  takeUntil(planChanged$),
                  finalize(() => stopToggling(id)),
                );
              }),
            ),
          ),
        ),
        update: rxMethod<{ id: number; patch: RequirementPatch }>(
          pipe(
            map(input => ({ ...input, epoch: loadEpoch })),
            concatMap(({ epoch, id, patch }) =>
              defer(() => {
                if (!isCurrentEpoch(epoch)) {
                  return EMPTY;
                }
                const partnerId = partnerService.getPartner()?.id;
                startMutation();
                if (partnerId == null) {
                  failMutation(MISSING_PARTNER_ERROR);
                  endMutation();
                  return EMPTY;
                }
                return service
                  .patch(partnerId, id, patch)
                  .pipe(
                    tap(row => {
                      const changes =
                        patch.active === undefined
                          ? { signerRole: row.signerRole, translations: row.translations }
                          : { active: row.active, signerRole: row.signerRole, translations: row.translations };
                      patchState(store, updateEntity({ changes, id }), {
                        mutationAction: 'updateSuccess',
                      });
                    }),
                    catchError((error: unknown) => {
                      failMutation(mapError(error));
                      return EMPTY;
                    }),
                  )
                  .pipe(
                    takeUntil(planChanged$),
                    finalize(() => endMutation()),
                  );
              }),
            ),
          ),
        ),
        clearBatchResult(): void {
          patchState(store, { lastBatchResult: null });
        },
        clearListAction(): void {
          patchState(store, { listAction: null });
        },
        clearMutationAction(): void {
          patchState(store, { lastMutationError: null, mutationAction: null });
        },
        load(input: { planId: number }): void {
          loadEpoch++;
          planChanged$.next();
          patchState(store, setAllEntities<AgreementRequirement>([]), {
            hasLoaded: false,
            lastBatchResult: null,
            lastMutationError: null,
            listAction: null,
            mutationAction: null,
            pendingMutations: 0,
            planId: input.planId,
            togglingIds: [],
          });
          fetchList({ planId: input.planId });
          fetchTicketTypes(input.planId);
        },
        refreshTicketTypes(): void {
          const partnerId = partnerService.getPartner()?.id;
          const planId = store.planId();
          if (partnerId == null || planId == null) {
            return;
          }
          ticketTypesCache.delete(catalogKey(partnerId, planId));
          fetchTicketTypes(planId);
        },
      };
    },
  ),
);
