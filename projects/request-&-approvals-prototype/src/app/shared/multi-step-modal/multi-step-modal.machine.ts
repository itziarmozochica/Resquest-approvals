import type { MultiStepModalConfig } from './models/multi-step-modal.model';

export function resolveNextStep<TContext, TStepId extends string, TIntent extends string>(
  config: MultiStepModalConfig<TContext, TStepId, TIntent>,
  currentStepId: TStepId,
  intent: TIntent,
  context: TContext,
): TStepId | null {
  const step = config.steps[currentStepId];
  const transition = step.transitions.find(candidate => candidate.on === intent);

  if (transition === undefined) {
    return null;
  }

  if (transition.guard !== undefined && !transition.guard(context)) {
    return null;
  }

  const target = typeof transition.target === 'function' ? transition.target(context) : transition.target;
  const targetStep = config.steps[target];

  if (targetStep === undefined) {
    return null;
  }

  if (targetStep.canEnter !== undefined && !targetStep.canEnter(context)) {
    return null;
  }

  return target;
}
