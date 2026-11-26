import { EVENT_SCHEDULE_TEMPLATE, EVENT_SCHEDULE_TEMPLATE_KEY } from './event-schedule-stepper-template';
import { InformationRequest } from './information-request.model';
import { MAIN_EVENT_TEMPLATE, MAIN_EVENT_TEMPLATE_KEY } from './main-event-stepper-template';
import { StepperTemplate } from './stepper-template.model';

/** Stepper templates the front-end ships itself, keyed by `stepperTemplateKey`. */
export const BUILT_IN_STEPPER_TEMPLATES: Record<string, StepperTemplate> = {
  [EVENT_SCHEDULE_TEMPLATE_KEY]: EVENT_SCHEDULE_TEMPLATE,
  [MAIN_EVENT_TEMPLATE_KEY]: MAIN_EVENT_TEMPLATE,
};

/**
 * Make built-in stepper templates resolvable in the fill view without backend support: for any
 * STEPPER_REF question whose `stepperTemplateKey` matches a built-in not already provided by the
 * backend, attach the built-in to `referencedStepperTemplates`. Backend-provided templates always
 * win, and requests that reference no built-in are returned untouched.
 */
export function withBuiltInStepperTemplates(request: InformationRequest): InformationRequest {
  const missing = (request.questions ?? [])
    .map(question => question.stepperTemplateKey)
    .filter((key): key is string => !!key && !!BUILT_IN_STEPPER_TEMPLATES[key] && !request.referencedStepperTemplates?.[key]);

  if (missing.length === 0) {
    return request;
  }

  const referencedStepperTemplates = { ...request.referencedStepperTemplates };
  for (const key of missing) {
    referencedStepperTemplates[key] = BUILT_IN_STEPPER_TEMPLATES[key];
  }
  return { ...request, referencedStepperTemplates };
}
