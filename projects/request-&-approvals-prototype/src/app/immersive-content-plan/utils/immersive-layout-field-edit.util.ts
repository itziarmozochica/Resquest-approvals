import type { ImmersiveLayoutTranslations, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import { isSwitchOffValue, type ModuleFieldView } from './immersive-layout-field-view.util';
import { extractTokens, wrapToken } from './immersive-layout-field.util';
import { generateFieldToken } from './immersive-layout-items.util';
import { normalizePositiveInteger } from './immersive-layout-number.util';

export type FieldInput = string | number | boolean | null;

export type FieldEdit =
  | { target: 'prop'; value: ImmersiveLayoutValue }
  | { target: 'token'; token: string; value: string; omitWhenBlank: boolean; mintedPropValue?: string };

export interface FieldEditContext {
  moduleId: string;
  translations: ImmersiveLayoutTranslations;
}

export function resolveFieldEdit(view: ModuleFieldView, input: FieldInput, context: FieldEditContext): FieldEdit | null {
  switch (view.kind) {
    case 'boolean':
      return { target: 'prop', value: input === true };
    case 'enum':
      return { target: 'prop', value: typeof input === 'string' ? input : null };
    case 'number':
      return { target: 'prop', value: normalizePositiveInteger(input) };
    case 'token':
      return resolveTokenEdit(view, input, context);
    default:
      return { target: 'prop', value: resolveDefaultValue(view, input) };
  }
}

function resolveDefaultValue(view: ModuleFieldView, input: FieldInput): string | null {
  if (input === null || (input === '' && view.nullWhenEmpty)) {
    return null;
  }
  return String(input);
}

function resolveTokenEdit(view: ModuleFieldView, input: FieldInput, context: FieldEditContext): FieldEdit | null {
  // A switch turned off: the prop goes, not the copy behind it (`patchModuleProp` clears both).
  if (input === null && view.isSwitchable) {
    return { target: 'prop', value: null };
  }
  const value = String(input ?? '');
  const omitWhenBlank = view.isSwitchable;
  if (view.token !== null) {
    return { omitWhenBlank, target: 'token', token: view.token, value };
  }
  if (view.raw !== undefined && !isSwitchOffValue(view, view.raw)) {
    return extractTokens(value).length > 0 ? null : { target: 'prop', value };
  }
  const token = generateFieldToken(
    context.moduleId,
    view.collected.label,
    view.collected.itemIndex,
    context.translations,
    view.collected.groupPath,
  );
  return { mintedPropValue: wrapToken(token), omitWhenBlank, target: 'token', token, value };
}

// The editor drafts whatever is typed, https or not: `isHttpsUrl` is the one policy the publish
// validator, the module gap badge and the persist gate all judge the draft with, so refusing the
// keystroke here would only hide the same value the draft carries anyway, one edit later. A `null`
// input (a switch turned off) passes straight through instead of coercing to the empty string, so
// `omitWhenEmpty` can tell "cleared" from "typed nothing".
