import type { Type } from '@angular/core';

export type MultiStepLoader = () => Promise<Type<unknown>>;

export type MultiStepTargetResolver<TContext, TStepId extends string> = TStepId | ((context: TContext) => TStepId);

export type MultiStepGuard<TContext> = (context: TContext) => boolean;

export type MultiStepProgressResolver<TContext> = (context: TContext) => number;

export type MultiStepActionKind = 'primary' | 'secondary';

export type MultiStepActionSentiment = 'default' | 'danger';

export type MultiStepActionPlacement = 'leading' | 'trailing';

export type MultiStepReservedIntent = 'back' | 'cancel' | 'close' | 'dismiss';

export interface MultiStepTransitionConfig<TContext, TStepId extends string, TIntent extends string> {
  on: TIntent;
  target: MultiStepTargetResolver<TContext, TStepId>;
  guard?: MultiStepGuard<TContext>;
}

export interface MultiStepActionConfig<TContext, TIntent extends string> {
  id: string;
  intent: TIntent;
  kind: MultiStepActionKind;
  labelKey: string;
  enabledWhen?: MultiStepGuard<TContext>;
  fullWidth?: boolean;
  placement?: MultiStepActionPlacement;
  sentiment?: MultiStepActionSentiment;
  visibleWhen?: MultiStepGuard<TContext>;
}

export interface MultiStepChromeConfig<TContext = unknown> {
  centerTitle?: boolean;
  compactLayout?: boolean;
  disableClose: boolean;
  fullWidthPrimary?: boolean;
  showBack: boolean;
  showClose: boolean | MultiStepGuard<TContext>;
  showProgress: boolean | MultiStepGuard<TContext>;
  closeCompletes?: boolean;
  showFooterSeparator?: boolean | MultiStepGuard<TContext>;
}

export interface MultiStepStepConfig<TContext, TStepId extends string, TIntent extends string> {
  actions: MultiStepActionConfig<TContext, TIntent>[];
  chrome: MultiStepChromeConfig<TContext>;
  id: TStepId;
  loader: MultiStepLoader;
  titleKey: string;
  transitions: MultiStepTransitionConfig<TContext, TStepId, TIntent>[];
  canEnter?: MultiStepGuard<TContext>;
  prefetch?: TStepId[];
}

export interface MultiStepModalConfig<TContext, TStepId extends string, TIntent extends string> {
  initialStepId: MultiStepTargetResolver<TContext, TStepId>;
  progress?: MultiStepProgressResolver<TContext>;
  steps: Record<TStepId, MultiStepStepConfig<TContext, TStepId, TIntent>>;
}

export interface MultiStepModalResult {
  completed: boolean;
  /**
   * The operator gave the task up (`cancel`) rather than merely stepping out of the modal
   * (`dismiss`) — both leave `completed` false, and a caller that unwinds further on one but not
   * the other has no way to tell them apart otherwise. Optional: a flow whose exits all mean the
   * same thing closes its own dialog directly and never sets it.
   */
  abandoned?: boolean;
}
