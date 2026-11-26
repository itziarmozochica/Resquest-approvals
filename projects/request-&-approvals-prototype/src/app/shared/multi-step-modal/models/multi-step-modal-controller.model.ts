import type { Signal } from '@angular/core';

import type { MultiStepActionConfig, MultiStepStepConfig } from './multi-step-modal.model';

export interface MultiStepModalController<TContext = unknown, TStepId extends string = string, TIntent extends string = string> {
  readonly canGoBack: Signal<boolean>;
  readonly currentStep: Signal<MultiStepStepConfig<TContext, TStepId, TIntent> | null>;
  readonly isCloseVisible: Signal<boolean>;
  readonly isFooterSeparatorVisible: Signal<boolean>;
  readonly isProgressVisible: Signal<boolean>;
  readonly progress: Signal<number>;
  getStep(id: TStepId): MultiStepStepConfig<TContext, TStepId, TIntent>;
  goBack(): void;
  isActionEnabled(action: MultiStepActionConfig<TContext, TIntent>): boolean;
  isActionVisible(action: MultiStepActionConfig<TContext, TIntent>): boolean;
  transition(intent: TIntent): void;
}
