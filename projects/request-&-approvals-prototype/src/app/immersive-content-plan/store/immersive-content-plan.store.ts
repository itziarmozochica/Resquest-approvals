import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { PlanEditionLockService } from '@fz-original/app/shared/services/plan-review/plan-edition-lock.service';
import { SelectedPlanContextService } from '@fz-original/app/shared/services/selected-plan-context/selected-plan-context.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  finalize,
  forkJoin,
  map,
  mergeMap,
  of,
  pipe,
  scan,
  switchMap,
  take,
  takeUntil,
  takeWhile,
  tap,
  timeout,
  timer,
} from 'rxjs';

import { GENERAL_SETTINGS_ID } from '../models/immersive-content-plan-editor.model';
import type { ImmersivePlanAudience } from '../models/immersive-layout-descriptor.model';
import { getDescriptor } from '../models/immersive-layout-descriptor.registry';
import type { ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import type { ImmersiveModuleType } from '../models/immersive-layout-module-type.model';
import type { AutoTranslateRequest } from '../models/immersive-layout-translation.model';
import { mediaCheckKey, type MediaCheck, type MediaProbeKind } from '../models/immersive-media-check.model';
import type { ImmersivePlanChannel } from '../models/immersive-plan-channel.model';
import { IMMERSIVE_PLAN_CONTEXT } from '../models/immersive-plan-context.model';
import type { PlanviewLayout, PlanviewLayoutEnvelope } from '../models/planview-layout-envelope.model';
import { initialState, type ImmersiveContentPlanStoreState, type PublishAction } from '../models/store/immersive-content-plan-store.model';
import { ImmersiveContentPlanService } from '../services/immersive-content-plan.service';
import { ImmersiveMediaProbeService } from '../services/immersive-media-probe.service';
import { publishImmersiveLayout } from '../tracking/events/publish-immersive-layout.event';
import { revertImmersiveLayout } from '../tracking/events/revert-immersive-layout.event';
import {
  deriveBaseLocale,
  deriveBaseLocaleDraft,
  deriveGapReport,
  deriveScreenState,
  isGenerationPollable,
} from '../utils/immersive-content-plan-derivations.util';
import { autoTranslatePlan, buildTranslateRequests, resolveAutoTranslateResult } from '../utils/immersive-layout-auto-translate.util';
import { applyCampaignBannerTemplate, isCampaignBannerTemplate } from '../utils/immersive-layout-campaign-banner.util';
import {
  buildChannelNames,
  createChannelVariant,
  hasChannelVariants,
  removeChannelVariant as removeVariantFromLayout,
} from '../utils/immersive-layout-channel-variants.util';
import { labelWorkingChanges } from '../utils/immersive-layout-diff-label.util';
import { findArrayDescriptor } from '../utils/immersive-layout-field.util';
import { findEditableModule, resolveDefaultModuleId } from '../utils/immersive-layout-general-settings.util';
import { addModuleItem, removeModuleItem } from '../utils/immersive-layout-items.util';
import { dropLegacyBooleanOpenEnded } from '../utils/immersive-layout-legacy-open-ended.util';
import { selectedLocaleAfterWrite } from '../utils/immersive-layout-locale.util';
import {
  collectMediaUrls,
  collectNewMediaUrls,
  mediaCheckKeyOf,
  sameMediaUrlSet,
  type MediaUrlRef,
} from '../utils/immersive-layout-media-urls.util';
import { deriveMediaErrors, mergeValidation } from '../utils/immersive-layout-media-validation.util';
import { buildModuleListViews } from '../utils/immersive-layout-module-views.util';
import {
  addModule as addModuleToLayout,
  omitReorderHintsForModule,
  removeModule as removeModuleFromLayout,
  resolveSelectionAfterDiscard,
  resolveSelectionAfterRemoveModule,
} from '../utils/immersive-layout-modules.util';
import { omitAtPath } from '../utils/immersive-layout-patch.util';
import { canEditImmersiveLayout } from '../utils/immersive-layout-permissions.util';
import {
  derivePersistGate,
  type LayoutPersistIntent,
  type PersistGate,
  type PersistGateInput,
} from '../utils/immersive-layout-persist-gate.util';
import { effectiveModuleItems } from '../utils/immersive-layout-prop-path.util';
import { mapPublishHttpError } from '../utils/immersive-layout-publish-errors.util';
import { buildPublishImmersiveLayoutData } from '../utils/immersive-layout-publish-tracking.util';
import { derivePublishValidation } from '../utils/immersive-layout-publish-validation.util';
import { moveArrayItem, moveModule as moveModuleOrder } from '../utils/immersive-layout-reorder.util';
import { collectWorkingChanges, patchModuleProp, patchTranslation, reorderIdentityOf } from '../utils/immersive-layout-working.util';
import { setError, setPending, setSuccess } from '../utils/request-state.util';

const POLL_INTERVAL_MS = 15000;
const MAX_POLL_ATTEMPTS = 40;
// `TimeoutInterceptor` is header-gated and nothing sets that header on this POST, so without a
// bound here a response that never settles keeps `pendingIntent` set forever and the bar inert.
const PERSIST_TIMEOUT_MS = 30_000;
const autoTranslateTimeoutMs = 70_000;

interface PersistIntentActions {
  error: PublishAction;
  success: PublishAction;
}

const INTENT_ACTIONS: Record<LayoutPersistIntent, PersistIntentActions> = {
  publish: { error: 'publishError', success: 'publishSuccess' },
  'revert-to-draft': { error: 'revertError', success: 'revertSuccess' },
  'save-draft': { error: 'saveError', success: 'saveSuccess' },
};

// `pendingIntent` belongs here with the rest: a write left in flight by the plan the user walked
// away from must not keep Publish, Save draft and Discard disabled on the plan they just opened.
const editorResetState: Partial<ImmersiveContentPlanStoreState> = {
  autoTranslateAction: null,
  autoTranslatingToken: null,
  // A probe result belongs to the document that was loaded when it ran: a plan switch must not
  // let a stale `broken` follow a url that only coincidentally matches one in the new document.
  mediaChecks: {},
  pendingIntent: null,
  publishAction: null,
  publishErrors: [],
  reorderHints: {},
  selectedChannel: null,
  selectedLocale: null,
  selectedModuleId: GENERAL_SETTINGS_ID,
};

export const ImmersiveContentPlanStore = signalStore(
  withState<ImmersiveContentPlanStoreState>(initialState),
  withComputed(({ channels, envelope, error, isLoading, mediaChecks, pendingIntent, reorderHints, selectedLocale, working }) => {
    const userService = inject(UserService);
    // `hasPermission` reads a mutable array, so the computed needs something to depend on: the
    // revision signal ticks on every permissions refresh. Precedent: `AgreementRequirementsStore`.
    const permissionsRevision = toSignal(userService.permissions$.pipe(scan(revision => revision + 1, 0)), { initialValue: 0 });
    // Holding an edit permission is not the same as being allowed to edit *this* plan: the review
    // workflow locks a plan while it is under review, and the per-kind manage permission is never
    // asked for on this route (`plan/detail` guards on `PlanKindViewGuard`, not `…ManageGuard`).
    // These two predicates are the same pair the sibling content and gallery tabs gate writes on.
    // They are composed here rather than reused through `EditingPlanService.canEditPlan()`, which
    // already combines them: that service sits in the feature-module tree, and this tree's
    // dependency boundary confines such imports to `containers/` — see the feature's AGENTS.md.
    // `canManageSelectedPlan` reads a subject rather than a signal, so it needs `toSignal` to be
    // reactive inside a computed; `isLockedForEdition` is already a signal.
    const selectedPlanContext = inject(SelectedPlanContextService);
    const planEditionLock = inject(PlanEditionLockService);
    const canManageSelectedPlan = toSignal(selectedPlanContext.observeCanManageSelectedPlan(), { initialValue: false });
    const canEditLayout = computed(() => {
      permissionsRevision();
      return (
        canEditImmersiveLayout(permission => userService.hasPermission(permission)) &&
        canManageSelectedPlan() &&
        !planEditionLock.isLockedForEdition()
      );
    });
    const planContext = inject(IMMERSIVE_PLAN_CONTEXT);
    // The one place the plan audience is decided: the hero render and the token ownership read it from here.
    const planAudience = computed<ImmersivePlanAudience | null>(() => {
      const isWaitlist = planContext.isWaitlist();

      if (isWaitlist === null) {
        return null;
      }

      return isWaitlist ? 'waitlist' : 'non-waitlist';
    });
    const baseLocale = computed(() => deriveBaseLocale(working()));
    const committedLayout = computed(() => envelope()?.layout ?? null);
    // The media urls the probe rxMethod feeds on: only the ones a keystroke just introduced, never
    // the whole committed document. Opening the editor must not spend a request on every media
    // field already on the page — only a freshly pasted or edited url gets probed automatically.
    const newMediaUrls = computed(() => collectNewMediaUrls(working(), committedLayout()));
    // Every media url flagged, new and committed alike: the gate needs the full set so a committed
    // url the preview dialog just proved broken (`recordMediaCheck`) still blocks publish.
    const mediaUrls = computed(() => collectMediaUrls(working()));
    // Validation runs on the working document, normalized exactly like the payload it will become,
    // so the module gap badge follows the edits instead of the last committed envelope. The
    // normalized document is kept and fed to the gates too: normalizing again per gate rebuilt the
    // whole translations map three times on every keystroke.
    const normalizedWorking = computed(() => derivePublishValidation(working(), baseLocale(), planAudience()));
    const publishValidation = computed(() => normalizedWorking().validation);
    // The document-level verdict merged with the media probes' verdict. A committed (kind, url)
    // pair with no check yet (or one only `checking` from an on-demand preview probe) never blocks
    // — only a new pair still unresolved, or ANY pair proven `broken`, reads as a gap the same a
    // missing translation would.
    const newMediaUrlSet = computed(() => new Set(newMediaUrls().map(mediaCheckKeyOf)));
    const validation = computed(() =>
      mergeValidation(publishValidation(), deriveMediaErrors(mediaUrls(), newMediaUrlSet(), mediaChecks())),
    );
    const gapReport = computed(() => deriveGapReport(validation()));
    const layout = computed(() => working());
    const channelNames = computed(() => buildChannelNames(channels()));
    // The one diff pass every dirty-state signal shares. It resolves no label, so the counter costs
    // the same on the hundredth keystroke as on the first; headers are attached only for the dialog.
    const workingChanges = computed(() => {
      const committed = committedLayout();
      const current = working();
      return committed === null || current === null ? [] : collectWorkingChanges(committed, current, reorderHints());
    });
    const draftCount = computed(() => workingChanges().length);
    // One live write at a time, and the three gates learn about it from the same place, so every
    // CTA disables itself while it runs. That is the whole of what this signal buys: the request
    // itself is single-flighted by `exhaustMap` in `persistLayout`, which never consults the gate.
    const isPersisting = computed(() => pendingIntent() !== null);
    const gateInput = computed<PersistGateInput>(() => ({
      canEdit: canEditLayout(),
      changeCount: workingChanges().length,
      committed: committedLayout(),
      isPersisting: isPersisting(),
      validation: validation(),
      working: normalizedWorking().normalized,
    }));
    return {
      baseLocale,
      canEditLayout,
      channelNames,
      committedLayout,
      draftCount,
      draftSaveability: computed(() => derivePersistGate(gateInput(), 'save-draft')),
      gapReport,
      generalSettingsDirty: computed(() => workingChanges().some(change => change.moduleId === GENERAL_SETTINGS_ID)),
      hasChannelVariants: computed(() => hasChannelVariants(committedLayout())),
      hasUnsavedChanges: computed(() => draftCount() > 0),
      isDraftLayout: computed(() => committedLayout()?.status === 'draft'),
      isPersisting,
      labelledChanges: computed(() => labelWorkingChanges(workingChanges(), working(), baseLocale(), channelNames())),
      layout,
      moduleViews: computed(() => {
        const current = layout();
        return current === null ? [] : buildModuleListViews(current, gapReport().gapsByModuleId, baseLocale());
      }),
      newMediaUrls,
      planAudience,
      publishability: computed(() => derivePersistGate(gateInput(), 'publish')),
      revertability: computed(() => derivePersistGate(gateInput(), 'revert-to-draft')),
      screenState: computed(() => deriveScreenState(envelope(), isLoading(), error())),
      selectedLocaleOrBase: computed(() => selectedLocale() ?? baseLocale()),
      validation,
    };
  }),
  withMethods(
    (store, immersiveContentPlanService = inject(ImmersiveContentPlanService), mediaProbeService = inject(ImmersiveMediaProbeService)) => {
      const patchWorking = (next: PlanviewLayout | null): void => patchState(store, { working: next });

      return {
        // A disabled flag or a failed request leaves no channel to add; the stored variants stay editable.
        loadChannels: rxMethod<{ partnerId: number; planId: number } | null>(
          pipe(
            // The previous plan's channels must not stay offered while the next plan's request is in flight.
            tap(() => patchState(store, { channels: [] })),
            switchMap(params =>
              params === null
                ? of([])
                : immersiveContentPlanService.getPlanChannels(params.partnerId, params.planId).pipe(catchError(() => of([]))),
            ),
            tap((channels: ImmersivePlanChannel[]) => patchState(store, { channels })),
          ),
        ),
        loadEnvelope: rxMethod<{ partnerId: number; planId: number } | null>(
          pipe(
            switchMap(params => {
              if (params === null) {
                // `editorEpoch` is the one slice that must not go back to its initial value: a write
                // still in flight compares against it, and a counter that resets could match again.
                patchState(store, { ...initialState, editorEpoch: store.editorEpoch() + 1 });
                return EMPTY;
              }
              const { partnerId, planId } = params;
              patchState(store, setPending(), {
                editorEpoch: store.editorEpoch() + 1,
                envelope: null,
                fetchAction: null,
                partnerId,
                planId,
                scheduleAction: null,
                working: null,
                ...editorResetState,
              });
              return timer(0, POLL_INTERVAL_MS).pipe(
                take(MAX_POLL_ATTEMPTS),
                exhaustMap(() =>
                  immersiveContentPlanService.getEnvelope(partnerId, planId).pipe(
                    catchError((error: unknown) => {
                      if (store.envelope() === null) {
                        patchState(store, setError(error), { fetchAction: 'fetchError' });
                      }
                      return EMPTY;
                    }),
                  ),
                ),
                tap((fetched: PlanviewLayoutEnvelope) => {
                  // The one place a fetched document enters the editor, so committed and working
                  // both start without the boolean the backend would reject on every write.
                  const envelope = fetched.layout === null ? fetched : { ...fetched, layout: dropLegacyBooleanOpenEnded(fetched.layout) };
                  const currentWorking = store.working();
                  const committed = store.envelope()?.layout ?? null;
                  const preserveCommitted = committed !== null && envelope.layout !== null;
                  const nextEnvelope = preserveCommitted ? { ...envelope, layout: committed } : envelope;
                  const statePatch: Partial<ImmersiveContentPlanStoreState> = {
                    envelope: nextEnvelope,
                    fetchAction: 'fetchSuccess',
                  };
                  if (envelope.layout !== null && currentWorking === null) {
                    statePatch.working = envelope.layout;
                    Object.assign(statePatch, editorResetState, { selectedModuleId: resolveDefaultModuleId(envelope.layout) });
                  }
                  patchState(store, setSuccess(), statePatch);
                }),
                takeWhile((envelope: PlanviewLayoutEnvelope) => isGenerationPollable(envelope), true),
                tap({
                  complete: () => {
                    if (isGenerationPollable(store.envelope())) {
                      patchState(store, { fetchAction: 'pollTimeout' });
                    }
                  },
                }),
              );
            }),
          ),
        ),
        // A new variant starts from what the user is looking at: the open variant, or the default module.
        addChannelVariant(channelId: string): void {
          const working = store.working();
          const next =
            working === null ? null : createChannelVariant(working, store.selectedModuleId(), channelId, store.selectedChannel());
          if (next !== null) {
            patchWorking(next);
            patchState(store, { selectedChannel: channelId });
          }
        },
        // `arrayPath` is already RESOLVED (a child group's own row index included, e.g.
        // `items.1.subitems`): `findArrayDescriptor` is what maps it back to its static group
        // descriptor, top-level or nested alike.
        addItem(moduleId: string, arrayPath: string): void {
          const working = store.working();
          if (working === null) {
            return;
          }
          const module = findEditableModule(working, moduleId);
          const descriptor = module === null ? undefined : getDescriptor(module.type);
          const group = descriptor === undefined ? undefined : findArrayDescriptor(descriptor, arrayPath);
          if (module === null || group === undefined) {
            return;
          }
          const next = addModuleItem(working, moduleId, group, arrayPath, store.baseLocale());
          if (next !== null) {
            patchWorking(next);
          }
        },
        // Refuses silently for the hero and for any type the picker itself already filters out
        // (`addModuleToLayout`'s own guard, kept there so the store never has to duplicate it).
        addModule(type: ImmersiveModuleType): void {
          const working = store.working();
          if (working === null) {
            return;
          }
          const result = addModuleToLayout(working, type);
          if (result === null) {
            return;
          }
          patchWorking(result.layout);
          patchState(store, { selectedChannel: null, selectedModuleId: result.moduleId });
        },
        clearAutoTranslateAction(): void {
          patchState(store, { autoTranslateAction: null });
        },
        clearPublishErrors(): void {
          patchState(store, { publishAction: null, publishErrors: [] });
        },
        discardDrafts(): void {
          // A discard rolls the working copy back to the committed document, which a write in flight
          // is about to replace. Let it through and the editor ends up holding the pre-write values
          // against the freshly committed ones: the bar reports unsaved changes that are really the
          // old copy, and the next save ships them back over the write that had just succeeded. It
          // is no escape hatch either — nothing here recalls the request; `timeout` ends a slow one.
          if (store.isPersisting()) {
            return;
          }
          const restored = store.envelope()?.layout ?? null;
          patchWorking(restored);
          patchState(store, {
            draftsEpoch: store.draftsEpoch() + 1,
            publishAction: null,
            publishErrors: [],
            reorderHints: {},
            selectedChannel: null,
            selectedModuleId:
              restored === null ? store.selectedModuleId() : resolveSelectionAfterDiscard(restored, store.selectedModuleId()),
          });
        },
        moveItem(moduleId: string, arrayPath: string, from: number, to: number): void {
          const working = store.working();
          if (working === null) {
            return;
          }
          const next = moveArrayItem(working, moduleId, arrayPath, from, to);
          if (next === working) {
            return;
          }
          patchWorking(next);
          // Recorded from the *pre-move* document: the diff engine only reads this to break an
          // otherwise-ambiguous tie (an adjacent swap, or a 2-item group), and only for this exact
          // group — see `detectSinglePermutationMove`.
          const module = findEditableModule(working, moduleId);
          const descriptor = module === null ? undefined : getDescriptor(module.type);
          const group = descriptor === undefined ? undefined : findArrayDescriptor(descriptor, arrayPath);
          if (module === null || group === undefined) {
            return;
          }
          const draggedItem = effectiveModuleItems(module, arrayPath)[from];
          if (draggedItem === undefined) {
            return;
          }
          patchState(store, {
            reorderHints: { ...store.reorderHints(), [`${moduleId}/${arrayPath}`]: reorderIdentityOf(group, draggedItem) },
          });
        },
        moveModule(from: number, to: number): void {
          const working = store.working();
          if (working === null) {
            return;
          }
          const next = moveModuleOrder(working, from, to);
          if (next === working) {
            return;
          }
          patchWorking(next);
          // Same reasoning as `moveItem`, keyed on the literal `'modules'` bucket instead of a group.
          const movedModuleId = working.schema.modules[from]?.id;
          if (movedModuleId === undefined) {
            return;
          }
          patchState(store, { reorderHints: { ...store.reorderHints(), modules: movedModuleId } });
        },
        // Fed `newMediaUrls` from the container, so every call carries the complete current list of
        // urls a keystroke actually introduced: `debounceTime` settles a burst of edits to the last
        // one, and the per-url filter is what keeps an already-checked url from being probed again.
        //
        // `newMediaUrls` recomputes (a fresh array) on *every* `working()` change, including an edit
        // to a field that carries no media url at all — `distinctUntilChanged` is what keeps such an
        // edit from restarting `debounceTime`'s timer: without it, typing in an unrelated field every
        // few hundred milliseconds could postpone the probe (and the `media_checking` gate it feeds)
        // indefinitely.
        probeMediaUrls: rxMethod<MediaUrlRef[]>(
          pipe(
            distinctUntilChanged(sameMediaUrlSet),
            debounceTime(400),
            mergeMap(refs => {
              // Two fields can carry the exact same (kind, url) pair (hero desktop/mobile media,
              // for one), so the batch is deduped by that pair before it ever reaches `mediaChecks`
              // — otherwise both would read as not-yet-checked and each mint its own probe for the
              // same value. Keying by `mediaCheckKeyOf` rather than `ref.url` is also what lets a
              // url probed under one kind be probed again once its sibling `type` flips: the two
              // resolve to different keys and neither reads as already checked.
              const uniqueRefs = new Map(refs.map(ref => [mediaCheckKeyOf(ref), ref] as const));
              return [...uniqueRefs.entries()].filter(([key]) => !(key in store.mediaChecks()));
            }),
            tap(([key]) => patchState(store, { mediaChecks: { ...store.mediaChecks(), [key]: { status: 'checking' } } })),
            // Same guard as `persistLayout`: the epoch is captured when this probe starts, not at
            // subscribe time, so a plan switch mid-flight cannot let its result land on the new plan.
            mergeMap(([key, ref]) => {
              const epochAtProbe = store.editorEpoch();
              const isStillTheSameEditor = (): boolean => store.editorEpoch() === epochAtProbe;
              return mediaProbeService.probe(ref.url, ref.media).pipe(
                map(check => ({ check, isStillTheSameEditor, key })),
                catchError(() => of({ check: { status: 'broken' } satisfies MediaCheck, isStillTheSameEditor, key })),
              );
            }),
            tap(({ check, isStillTheSameEditor, key }) => {
              if (!isStillTheSameEditor()) {
                return;
              }
              patchState(store, { mediaChecks: { ...store.mediaChecks(), [key]: check } });
            }),
          ),
        ),
        // Plain, synchronous write: the preview dialog is itself the probe (it resolves load state
        // from the `<img>`/`<video>` it renders), so there is no in-flight request here to epoch-guard
        // — the dialog only ever reports back while it belongs to the still-open editor that opened it.
        // `media` is the resolved kind the dialog actually probed under (see `resolveMediaKindForField`),
        // never a guess: it is what keys the cache entry this check must land in.
        recordMediaCheck(media: MediaProbeKind, url: string, check: MediaCheck): void {
          patchState(store, { mediaChecks: { ...store.mediaChecks(), [mediaCheckKey(media, url)]: check } });
        },
        removeChannelVariant(channelId: string): void {
          const working = store.working();
          const next = working === null ? null : removeVariantFromLayout(working, store.selectedModuleId(), channelId);
          if (next !== null) {
            patchWorking(next);
            patchState(store, { selectedChannel: null });
          }
        },
        removeItem(moduleId: string, arrayPath: string, itemIndex: number): void {
          const working = store.working();
          if (working === null) {
            return;
          }
          const next = removeModuleItem(working, moduleId, arrayPath, itemIndex);
          if (next !== null) {
            patchWorking(next);
          }
        },
        // The hero refuses silently, same as `addModule` (`removeModuleFromLayout`'s own guard).
        // Gap state needs no cleanup here: `gapReport` is entirely derived from `working()`, so it
        // already reads correctly the instant the module is gone — there is no separate slice of it
        // to invalidate, unlike `reorderHints` and `selectedModuleId`, which are real store state.
        removeModule(moduleId: string): void {
          const working = store.working();
          if (working === null) {
            return;
          }
          const next = removeModuleFromLayout(working, moduleId);
          if (next === null) {
            return;
          }
          // Read from the panel's VISIBLE order as it stood BEFORE the removal — `resolveSelectionAfterRemoveModule`
          // needs the removed row's own position among its neighbours, which `next` no longer has.
          const previousViews = store.moduleViews();
          patchWorking(next);
          patchState(store, {
            reorderHints: omitReorderHintsForModule(store.reorderHints(), moduleId),
            selectedChannel: null,
            selectedModuleId:
              store.selectedModuleId() === moduleId
                ? resolveSelectionAfterRemoveModule(previousViews, moduleId, next)
                : store.selectedModuleId(),
          });
        },
        selectChannel(channelId: string | null): void {
          patchState(store, { selectedChannel: channelId });
        },
        selectLocale(locale: string): void {
          patchState(store, { selectedLocale: locale });
        },
        selectModule(moduleId: string): void {
          patchState(store, { selectedChannel: null, selectedModuleId: moduleId });
        },
        setBaseLocale(locale: string): void {
          const working = store.working();
          if (working === null || store.autoTranslatingToken() !== null || store.isPersisting()) {
            return;
          }
          patchWorking({ ...working, base_locale: deriveBaseLocaleDraft(store.committedLayout(), locale) });
        },
        setChannelVariantsEnabled(isEnabled: boolean): void {
          patchState(store, { isChannelVariantsEnabled: isEnabled });
        },
        setPropDraft(moduleId: string, propPath: string, value: ImmersiveLayoutValue): void {
          const working = store.working();
          if (working === null) {
            return;
          }
          patchWorking(
            isCampaignBannerTemplate(working, moduleId, propPath)
              ? applyCampaignBannerTemplate(working, moduleId, value)
              : patchModuleProp(working, moduleId, propPath, value),
          );
        },
        setTokenDraft(locale: string, token: string, value: string, omitWhenBlank = false): void {
          const working = store.working();
          if (working === null) {
            return;
          }
          // A switchable token owns its key only while it has copy to show: blank copy is absence.
          patchWorking(
            omitWhenBlank && value.trim() === ''
              ? omitAtPath(working, ['translations', locale, token])
              : patchTranslation(working, locale, token, value),
          );
        },
        setVenueSvgEnabled(isEnabled: boolean): void {
          patchState(store, { isVenueSvgEnabled: isEnabled });
        },
      };
    },
  ),
  withMethods((store, immersiveContentPlanService = inject(ImmersiveContentPlanService), fzTracking = inject(FzTrackingService)) => {
    const runEpochs$ = toObservable(computed(() => ({ drafts: store.draftsEpoch(), editor: store.editorEpoch() })));
    const gateByIntent: Record<LayoutPersistIntent, () => PersistGate> = {
      publish: store.publishability,
      'revert-to-draft': store.revertability,
      'save-draft': store.draftSaveability,
    };

    return {
      autoTranslateToken: rxMethod<AutoTranslateRequest>(
        pipe(
          exhaustMap(({ mode, token }) => {
            const working = store.working();
            const baseLocale = store.baseLocale();
            const partnerId = store.partnerId();
            const plan = working === null || baseLocale === null ? null : autoTranslatePlan(working, token, baseLocale, mode);
            if (!store.canEditLayout() || baseLocale === null || partnerId === null || plan === null) {
              return EMPTY;
            }

            const { source, targets } = plan;
            const requests = buildTranslateRequests(source, baseLocale, targets, token);
            const draftsEpochAtStart = store.draftsEpoch();
            const editorEpochAtStart = store.editorEpoch();
            function isStillTheSameRun(): boolean {
              return store.draftsEpoch() === draftsEpochAtStart && store.editorEpoch() === editorEpochAtStart;
            }
            patchState(store, { autoTranslateAction: null, autoTranslatingToken: token });

            return forkJoin(
              requests.map(request =>
                immersiveContentPlanService.translateTexts(partnerId, request).pipe(
                  timeout(autoTranslateTimeoutMs),
                  catchError((error: unknown) => of(error instanceof HttpErrorResponse ? error : null)),
                ),
              ),
            ).pipe(
              takeUntil(runEpochs$.pipe(filter(({ drafts, editor }) => drafts !== draftsEpochAtStart || editor !== editorEpochAtStart))),
              tap(results => {
                const current = store.working();
                const result =
                  current === null || !isStillTheSameRun()
                    ? null
                    : resolveAutoTranslateResult(current, token, baseLocale, plan, requests, results);
                if (result !== null) {
                  patchState(store, { autoTranslateAction: result.action, working: result.working });
                }
              }),
              finalize(() => {
                if (store.autoTranslatingToken() === token) {
                  patchState(store, { autoTranslatingToken: null });
                }
              }),
            );
          }),
        ),
      ),
      persistLayout: rxMethod<{ intent: LayoutPersistIntent }>(
        pipe(
          exhaustMap(({ intent }) => {
            const partnerId = store.partnerId();
            const planId = store.planId();
            const committed = store.committedLayout();
            const envelope = store.envelope();
            const working = store.working();
            const hintsAtWrite = store.reorderHints();
            const { error: errorAction, success: successAction } = INTENT_ACTIONS[intent];

            // One gate decides for the CTA, the confirm dialog and this request alike, and it
            // hands back the exact payload it validated. Its `in-progress` verdict cannot arrive
            // here: `exhaustMap` has already dropped the second click before this projection runs,
            // so that reason only ever reaches the buttons.
            const gate = gateByIntent[intent]();
            if (gate.reason !== 'ready') {
              patchState(store, { publishAction: errorAction, publishErrors: [...gate.errors] });
              return EMPTY;
            }

            // Both early exits stay ahead of the pending patch, so a refused write never leaves
            // `pendingIntent` set and the bar inert.
            if (partnerId === null || planId === null || committed === null || envelope === null || working === null) {
              return EMPTY;
            }

            const payload = gate.payload;

            patchState(store, setPending(), { pendingIntent: intent, publishAction: null, publishErrors: [] });

            // The editor is not a routed component: the plan selector pushes a new plan through the
            // same live instance, so a write can outlive the document it was built from. Every
            // outcome below therefore checks that the store is still in the editing session that
            // issued this write. Comparing `partnerId`/`planId` is not enough — leaving plan A for
            // B and returning to A makes the ids match again, and the abandoned response would
            // then overwrite the freshly fetched document, and any edit made since, reporting a
            // clean save. The epoch only ever moves forward, so a return never looks like a stay.
            const epochAtWrite = store.editorEpoch();
            const isStillTheSameEditor = (): boolean => store.editorEpoch() === epochAtWrite;

            return immersiveContentPlanService.upsertLayout(partnerId, planId, payload).pipe(
              timeout(PERSIST_TIMEOUT_MS),
              tap(response => {
                if (!isStillTheSameEditor()) {
                  return;
                }
                // Built from the payload that was actually sent, never from the raw `working`:
                // the gate normalises locale keys on the way out, so adopting `working` here
                // would leave the client on `en-GB` while the server holds `en_GB`. Nothing
                // reconverges afterwards — `loadEnvelope` preserves the committed copy — so a
                // later revert would ship the hyphen straight back and undo the canonicalisation
                // this very write just installed.
                const persistedLayout: PlanviewLayout = {
                  ...payload,
                  updated_at: response.updated_at,
                };
                const currentEnvelope = store.envelope() ?? envelope;
                // The selection follows the document that was actually written — see
                // `selectedLocaleAfterWrite`, which is the rule, because a revert ships the
                // committed keys untouched while every other intent ships the normalised ones.
                const selectedLocaleBeforeWrite = store.selectedLocale();
                // `committed` is always what the server now holds, but `working` is only replaced
                // when the user has not typed since the payload was built. Nothing goes read-only
                // during a write, so an edit made while it was in flight is real work — adopting
                // the payload over it discarded it and then reported a clean save. Identity is
                // enough to tell: every edit patches `working` with a fresh object. The status and
                // timestamp still come from the write, so the bar does not read as a stale draft.
                const liveWorking = store.working();
                const workingMovedSincePayload = liveWorking !== null && liveWorking !== working;
                // Every move overwrites its group's hint, so hints stay whole while live edits survive the write.
                patchState(store, setSuccess(), {
                  envelope: { ...currentEnvelope, layout: persistedLayout },
                  pendingIntent: null,
                  publishAction: successAction,
                  publishErrors: [],
                  reorderHints: workingMovedSincePayload ? store.reorderHints() : {},
                  selectedLocale: selectedLocaleAfterWrite(selectedLocaleBeforeWrite, persistedLayout),
                  working: workingMovedSincePayload
                    ? { ...liveWorking, status: persistedLayout.status, updated_at: persistedLayout.updated_at }
                    : persistedLayout,
                });
                if (intent === 'publish') {
                  // Only publish reports a diff, so only publish pays for one. A revert is a
                  // state-only write with no changes by definition, and a draft save reports none.
                  fzTracking.track(
                    publishImmersiveLayout(
                      buildPublishImmersiveLayoutData(collectWorkingChanges(committed, working, hintsAtWrite), planId),
                    ),
                  );
                }
                if (intent === 'revert-to-draft') {
                  fzTracking.track(revertImmersiveLayout({ planId }));
                }
              }),
              catchError((error: unknown) => {
                if (!isStillTheSameEditor()) {
                  return EMPTY;
                }
                // 401 and 403 are already surfaced by `AuthenticationInterceptor` (session modal /
                // forbidden toast), so the lock is released without arming a second notification.
                const isHandledByAuthInterceptor = error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
                // A 409 gets its own action, and deliberately no re-fetch: chaining `loadEnvelope`
                // here reset the editor in the same synchronous turn, so the notification never
                // reached the effect that reads it and the unsaved edits went with it. The user's
                // edits are the one thing a re-GET cannot bring back, so they stay and the copy
                // tells them to reload.
                const isConflict = error instanceof HttpErrorResponse && error.status === 409;
                patchState(store, setError(error), {
                  pendingIntent: null,
                  publishAction: isHandledByAuthInterceptor ? null : isConflict ? 'conflict' : errorAction,
                  publishErrors: isHandledByAuthInterceptor ? [] : mapPublishHttpError(error, intent),
                });
                return EMPTY;
              }),
            );
          }),
        ),
      ),
      scheduleGeneration: rxMethod<{ partnerId: number; planId: number }>(
        pipe(
          exhaustMap(({ partnerId, planId }) => {
            patchState(store, setPending(), { scheduleAction: null });
            return immersiveContentPlanService.scheduleGeneration(partnerId, planId).pipe(
              tap(() => {
                store.loadEnvelope({ partnerId, planId });
              }),
              catchError((error: unknown) => {
                store.loadEnvelope({ partnerId, planId });
                if (!(error instanceof HttpErrorResponse && error.status === 409)) {
                  patchState(store, { scheduleAction: 'scheduleError' });
                }
                return EMPTY;
              }),
            );
          }),
        ),
      ),
    };
  }),
);
