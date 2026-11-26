import {
  StepperTemplate,
  StepperTemplateSummary,
} from '@fz-original/app/modules/ir-approval/information-requests/models/stepper-template.model';

/** A stepper template summary tagged with whether it comes from a front-end built-in. */
export interface StepperCatalogEntry extends StepperTemplateSummary {
  builtin: boolean;
}

/**
 * Merge the backend stepper templates with the front-end built-ins so the admin catalog also lists
 * templates the front-end ships (e.g. the Main event wizard). Backend entries win on key collision.
 */
export function mergeStepperCatalog(backend: StepperTemplateSummary[], builtins: Record<string, StepperTemplate>): StepperCatalogEntry[] {
  const backendKeys = new Set(backend.map(t => t.key));
  const fromBackend: StepperCatalogEntry[] = backend.map(t => ({ ...t, builtin: false }));
  const fromBuiltins: StepperCatalogEntry[] = Object.values(builtins)
    .filter(t => !backendKeys.has(t.key))
    .map(t => ({ key: t.key, label: t.label, multiInstance: t.multiInstance, builtin: true }));
  return [...fromBackend, ...fromBuiltins];
}
