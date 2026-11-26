import { computed, inject } from '@angular/core';

import { patchState, signalStoreFeature, type, withComputed, withMethods } from '@ngrx/signals';

import type { MultiStepActionConfig, MultiStepModalConfig, MultiStepStepConfig } from '../models/multi-step-modal.model';
import { resolveNextStep } from '../multi-step-modal.machine';
import { MULTI_STEP_MODAL_CONFIG } from '../tokens/multi-step-modal.token';

export function withMultiStepNavigation<TContext, TStepId extends string, TIntent extends string>() {
  return signalStoreFeature(
    {
      state: type<{
        context: TContext;
        currentStepId: TStepId | null;
        history: TStepId[];
      }>(),
    },
    withComputed(store => {
      const config = inject(MULTI_STEP_MODAL_CONFIG) as MultiStepModalConfig<TContext, TStepId, TIntent>;
      return {
        canGoBack: computed<boolean>(() => store.history().length > 0),
        currentStep: computed<MultiStepStepConfig<TContext, TStepId, TIntent> | null>(() => {
          const id = store.currentStepId();
          return id === null ? null : config.steps[id];
        }),
        isCloseVisible: computed<boolean>(() => {
          const id = store.currentStepId();
          if (id === null) {
            return false;
          }
          const { showClose } = config.steps[id].chrome;
          return typeof showClose === 'function' ? showClose(store.context()) : showClose;
        }),
        isFooterSeparatorVisible: computed<boolean>(() => {
          const id = store.currentStepId();
          if (id === null) {
            return false;
          }
          const { showFooterSeparator } = config.steps[id].chrome;
          if (showFooterSeparator === undefined) {
            return false;
          }
          return typeof showFooterSeparator === 'function' ? showFooterSeparator(store.context()) : showFooterSeparator;
        }),
        isProgressVisible: computed<boolean>(() => {
          const id = store.currentStepId();
          if (id === null) {
            return false;
          }
          const { showProgress } = config.steps[id].chrome;
          return typeof showProgress === 'function' ? showProgress(store.context()) : showProgress;
        }),
        progress: computed<number>(() => {
          if (config.progress !== undefined) {
            return Math.min(1, Math.max(0, config.progress(store.context())));
          }
          const total = Object.keys(config.steps).length;
          return total === 0 ? 0 : store.history().length / total;
        }),
      };
    }),
    withMethods(store => {
      const config = inject(MULTI_STEP_MODAL_CONFIG) as MultiStepModalConfig<TContext, TStepId, TIntent>;
      return {
        getStep(id: TStepId): MultiStepStepConfig<TContext, TStepId, TIntent> {
          return config.steps[id];
        },
        goBack(): void {
          const history = store.history();
          if (history.length === 0) {
            return;
          }
          patchState(store, { currentStepId: history[history.length - 1], history: history.slice(0, -1) });
        },
        initNavigation(): void {
          if (store.currentStepId() === null) {
            const initialStepId = typeof config.initialStepId === 'function' ? config.initialStepId(store.context()) : config.initialStepId;
            patchState(store, { currentStepId: initialStepId });
          }
        },
        isActionEnabled(action: MultiStepActionConfig<TContext, TIntent>): boolean {
          return action.enabledWhen === undefined || action.enabledWhen(store.context());
        },
        isActionVisible(action: MultiStepActionConfig<TContext, TIntent>): boolean {
          return action.visibleWhen === undefined || action.visibleWhen(store.context());
        },
        transition(intent: TIntent): void {
          const currentId = store.currentStepId();
          if (currentId === null) {
            return;
          }
          const nextId = resolveNextStep(config, currentId, intent, store.context());
          if (nextId === null) {
            return;
          }
          const history = store.history();
          const revisitIndex = history.indexOf(nextId);
          const nextHistory = revisitIndex === -1 ? [...history, currentId] : history.slice(0, revisitIndex);
          patchState(store, { currentStepId: nextId, history: nextHistory });
        },
      };
    }),
  );
}
