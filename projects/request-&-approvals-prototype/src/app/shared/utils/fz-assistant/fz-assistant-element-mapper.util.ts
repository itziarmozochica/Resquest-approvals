import { AssistantWidgetSnapshot } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-capable.model';
import { FzAssistantA11yRead, FzAssistantCapturedElement } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-captured.model';
import {
  FzAssistantElementOptions,
  FzAssistantElementType,
  FzAssistantWireValue,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';
import {
  isFzAssistantDeclaredConstraintSchema,
  toFzAssistantValueSchema,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-declared-constraints.util';
import {
  isFzAssistantElementReadonly,
  isFzAssistantElementUnavailable,
  isFzAssistantOptionUnavailable,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-disabled-state.util';
import { readFzAssistantNativeControlKind } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-native-control-kind.util';
import { readFzAssistantNativeValue } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-native-value.util';
import {
  isFzAssistantSecretField,
  sanitizeFzAssistantIframeSrc,
} from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-secret-redaction.util';

export interface MapFzAssistantCapturedElementArgs {
  a11y: FzAssistantA11yRead;
  element: Element;
  ref: string;
  snapshot?: AssistantWidgetSnapshot;
  captureError?: FzAssistantCapturedElement['capture_error'];
  tableSummary?: FzAssistantCapturedElement['table_summary'];
}

export function mapFzAssistantCapturedElement(args: MapFzAssistantCapturedElementArgs): FzAssistantCapturedElement {
  const { a11y, element, ref, snapshot, captureError, tableSummary } = args;
  const synthesizedLabelFallback = tableSummary !== undefined ? 'Table' : element instanceof HTMLIFrameElement ? 'Iframe' : '';
  const { label, accessibleNameSource } = resolveCapturedLabel(a11y, snapshot?.label, synthesizedLabelFallback);

  if (tableSummary !== undefined) {
    // Capture keeps full `table_summary`; agent wire uses lean `value` only (serializer strips
    // `table_summary` so cell samples can never leak if a future capture revision adds `rows`).
    const value: Record<string, unknown> = {
      headers: tableSummary.headers,
      row_count: tableSummary.row_count,
    };
    if (tableSummary.has_interactive_rows === true) {
      value['has_interactive_rows'] = true;
    }

    return {
      ref,
      type: 'text',
      label,
      value,
      role: a11y.role !== '' ? a11y.role : 'table',
      isComposite: true,
      table_summary: tableSummary,
      ...(accessibleNameSource !== undefined ? { accessibleNameSource } : {}),
    };
  }

  if (element instanceof HTMLIFrameElement) {
    const iframeSrc = readIframeSrc(element);
    const capturedIframe: FzAssistantCapturedElement = {
      ref,
      type: 'iframe',
      label,
      role: a11y.role !== '' ? a11y.role : 'iframe',
    };

    assignDefined(capturedIframe, [
      ['value', iframeSrc],
      ['accessibleNameSource', accessibleNameSource],
      ['capture_error', captureError],
    ]);

    return capturedIframe;
  }

  if (snapshot === undefined && isSharedTypeaheadHost(element)) {
    return mapSharedTypeaheadFromDom({ a11y, captureError, element, label, accessibleNameSource, ref });
  }

  if (snapshot === undefined && isRichTextEditorLeaf(element)) {
    return mapRichTextEditorFromDom({ a11y, captureError, element, label, accessibleNameSource, ref });
  }

  const type = snapshot?.type ?? mapNativeOrRoleType(element, a11y.role);
  const nativeValue = readFzAssistantNativeValue(element);
  const value = snapshot?.value !== undefined ? snapshot.value : nativeValue !== undefined ? nativeValue : readAriaSelectValue(element);
  const options = snapshot?.options ?? readNativeOptions(element) ?? readAriaSelectOptions(element);

  const captured: FzAssistantCapturedElement = {
    ref,
    type,
    label,
  };

  assignDefined(captured, [
    ['value', value],
    ['options', options],
    ['available_actions', snapshot?.available_actions],
    // The Act write path refuses fills that violate these, so the agent is told them to pick a legal
    // value instead of retrying blindly. Which constraints qualify - and why the set stops where it
    // does - belongs to `toFzAssistantValueSchema`, the single source both sides read.
    ['value_schema', readValueSchema(element, snapshot)],
    ['isRequired', snapshot?.isRequired === true ? true : readNativeRequired(element)],
    ['isDisabled', snapshot?.isDisabled === true ? true : readNativeDisabled(element)],
    ['isReadonly', snapshot?.isReadonly === true ? true : readNativeReadonly(element)],
    ['isSelected', snapshot?.isSelected === true ? true : readNativeSelected(element)],
    ['isConfirmationRequired', snapshot?.isConfirmationRequired === true ? true : undefined],
    ['isComposite', snapshot?.isComposite === true ? true : undefined],
    ['widget', snapshot?.widget],
    ['role', a11y.role !== '' ? a11y.role : undefined],
    ['accessibleNameSource', accessibleNameSource],
    ['capture_error', captureError],
  ]);

  return captured;
}

export function mapNativeOrRoleType(element: Element, role: string): FzAssistantElementType {
  if (element instanceof HTMLSelectElement) {
    return element.multiple ? 'select_many' : 'select';
  }

  // One classification of the DOM, shared with the write path, so the `type` published here cannot
  // disagree with the writer Act picks. Kinds finer than the vocabulary collapse into it: `password`,
  // `color` and `file` are all wire `text`, exactly as the type switch that stood here mapped them.
  const kind = readFzAssistantNativeControlKind(element);
  switch (kind) {
    case 'numeric':
    case 'range':
      return 'number';
    case 'checkbox':
    case 'radio':
      return 'boolean';
    case 'date':
      return 'date';
    case 'time':
      return 'time';
    case 'button':
      return 'button';
    case 'color':
    case 'file':
    case 'password':
    case 'text':
      return 'text';
    default:
      break;
  }

  if (element instanceof HTMLAnchorElement) {
    return 'link';
  }

  if (element instanceof HTMLIFrameElement) {
    return 'iframe';
  }

  return mapRoleToType(role);
}

function mapRoleToType(role: string): FzAssistantElementType {
  switch (role) {
    case 'button':
      return 'button';
    case 'link':
      return 'link';
    case 'combobox':
      return 'select';
    case 'listbox':
      return 'select_many';
    case 'checkbox':
    case 'switch':
    case 'radio':
      return 'boolean';
    case 'spinbutton':
    case 'slider':
      return 'number';
    case 'tab':
      return 'tab';
    default:
      return 'text';
  }
}

function readIframeSrc(element: HTMLIFrameElement): string | undefined {
  const resolvedSrc = normalizeText(element.src);
  if (resolvedSrc !== '' && resolvedSrc !== 'about:blank') {
    return sanitizeFzAssistantIframeSrc(resolvedSrc);
  }

  const attrSrc = normalizeText(element.getAttribute('src'));
  if (attrSrc !== '') {
    return sanitizeFzAssistantIframeSrc(attrSrc);
  }

  const srcdoc = element.getAttribute('srcdoc');
  if (srcdoc !== null && srcdoc.trim() !== '') {
    return 'about:srcdoc';
  }

  return resolvedSrc !== '' ? sanitizeFzAssistantIframeSrc(resolvedSrc) : undefined;
}

/**
 * A composite's schema describes its object payload, so it travels whatever shape it is.
 *
 * A leaf's own snapshot schema travels too, but only when it *is* a set of declared constraints: an Ignite
 * leaf with a real `maxlength` has no other way to disclose it, and the DOM underneath a capable host does
 * not always carry the constraint the widget enforces. Publishing it makes the widget's contract binding -
 * `applyAssistantValue` owes a refusal on a value that violates something `getAssistantSnapshot` published.
 *
 * Anything else on a leaf is discarded and the DOM is read instead, so a snapshot cannot put arbitrary JSON
 * in front of the agent.
 */
function readValueSchema(element: Element, snapshot: AssistantWidgetSnapshot | undefined): Record<string, unknown> | undefined {
  // Before either source: nothing about a secret travels, and a `pattern` on one can describe the secret.
  // `toFzAssistantValueSchema` gates on this, so without the check here the snapshot branch below would
  // publish exactly what that gate suppressed.
  if (isFzAssistantSecretField(element)) {
    return undefined;
  }

  if (snapshot?.isComposite === true) {
    return snapshot.value_schema;
  }

  // The DOM comes first, because that is what the native write path enforces. A snapshot schema that
  // replaced it would publish the widget's numbers while `satisfiesFzAssistantDeclaredConstraints` refused
  // on the element's own - a refusal on a constraint never disclosed, in answer to a value the wire invited.
  const declaredSchema = toFzAssistantValueSchema(element);
  if (declaredSchema !== undefined) {
    return declaredSchema;
  }

  // Nothing declared on the element, so a widget's own constraints fill the gap rather than override it -
  // an Ignite leaf with a real `maxlength` on its inner input has no other way to disclose it.
  return isFzAssistantDeclaredConstraintSchema(snapshot?.value_schema) ? snapshot?.value_schema : undefined;
}

function readNativeOptions(element: Element): FzAssistantElementOptions | undefined {
  if (!(element instanceof HTMLSelectElement)) {
    return undefined;
  }

  if (element.options.length === 0) {
    // Preserve `[]` at capture so act/diagnostics can tell "options element, none loaded yet"
    // from "not an options element". Wire still omits empty options in serializeElement.
    return [];
  }

  // Options the Partner cannot choose are omitted, not flagged: the wire has no per-option
  // disabled field (§3.4), and the native write path refuses these same options, so advertising
  // them would offer the agent choices Act would reject. Covers the common
  // `<option disabled selected>Select a city</option>` placeholder, whose value is still
  // reported through `value`.
  const selectable = Array.from(element.options).filter(option => !isFzAssistantOptionUnavailable(option));
  const values = selectable.map(option => option.value);
  const labels = selectable.map(option => normalizeText(option.label || option.textContent));
  const idsMatchLabels = values.every((value, index) => value === labels[index]);

  if (idsMatchLabels) {
    return values;
  }

  return values.map((id, index) => ({
    id,
    label: labels[index] ?? id,
  }));
}

/** Options for ARIA combobox/listbox hosts from `[role=option]` descendants (not separate candidates). */
function readAriaSelectOptions(element: Element): FzAssistantElementOptions | undefined {
  const role = element.getAttribute('role')?.trim().toLowerCase();
  if (role !== 'combobox' && role !== 'listbox') {
    return undefined;
  }

  const optionNodes = element.querySelectorAll('[role="option"]');
  if (optionNodes.length === 0) {
    return [];
  }

  const labels: string[] = [];
  for (let index = 0; index < optionNodes.length; index++) {
    const option = optionNodes.item(index);
    if (option === null) {
      continue;
    }

    const label = normalizeText(option.textContent);
    if (label !== '') {
      labels.push(label);
    }
  }

  return labels;
}

/**
 * Current selection for ARIA combobox/listbox hosts.
 * Prefers `[role=option][aria-selected=true]` labels; falls back to `aria-activedescendant`.
 * Labels-only (same as {@link readAriaSelectOptions}) — duplicate labels are indistinguishable in V1.
 * Listbox always maps to `select_many`, so values are `string[]` (including a single selection),
 * matching native `<select multiple>`.
 */
function readAriaSelectValue(element: Element): FzAssistantWireValue | undefined {
  const role = element.getAttribute('role')?.trim().toLowerCase();
  if (role !== 'combobox' && role !== 'listbox') {
    return undefined;
  }

  const selectedLabels: string[] = [];
  const selectedOptions = element.querySelectorAll('[role="option"][aria-selected="true"]');
  for (let index = 0; index < selectedOptions.length; index++) {
    const option = selectedOptions.item(index);
    if (option === null) {
      continue;
    }

    const label = normalizeText(option.textContent);
    if (label !== '') {
      selectedLabels.push(label);
    }
  }

  if (role === 'listbox') {
    if (selectedLabels.length > 0) {
      return selectedLabels;
    }

    const activeLabel = readAriaActiveDescendantLabel(element);
    return activeLabel !== undefined ? [activeLabel] : [];
  }

  if (selectedLabels.length === 1) {
    return selectedLabels[0];
  }

  if (selectedLabels.length > 1) {
    return selectedLabels;
  }

  return readAriaActiveDescendantLabel(element);
}

function readAriaActiveDescendantLabel(element: Element): string | undefined {
  const activeDescendantId = element.getAttribute('aria-activedescendant')?.trim();
  if (activeDescendantId === undefined || activeDescendantId === '') {
    return undefined;
  }

  const optionNodes = element.querySelectorAll('[role="option"]');
  for (let index = 0; index < optionNodes.length; index++) {
    const option = optionNodes.item(index);
    if (option === null || option.id !== activeDescendantId) {
      continue;
    }

    const activeLabel = normalizeText(option.textContent);
    return activeLabel !== '' ? activeLabel : undefined;
  }

  return undefined;
}

function readNativeRequired(element: Element): true | undefined {
  if (
    (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) &&
    element.required
  ) {
    return true;
  }

  return undefined;
}

function readNativeDisabled(element: Element): true | undefined {
  // Shared with the Act write path so a control Act always refuses is never offered as enabled.
  return isFzAssistantElementUnavailable(element) ? true : undefined;
}

function readNativeReadonly(element: Element): true | undefined {
  // Shared with the Act write path, for the same reason as `readNativeDisabled`.
  return isFzAssistantElementReadonly(element) ? true : undefined;
}

function readNativeSelected(element: Element): true | undefined {
  if (element instanceof HTMLOptionElement && element.selected) {
    return true;
  }

  if (element.getAttribute('aria-selected') === 'true') {
    return true;
  }

  return undefined;
}

function assignDefined<TTarget extends object>(
  target: TTarget,
  entries: ReadonlyArray<readonly [keyof TTarget, TTarget[keyof TTarget] | undefined]>,
): void {
  for (const [key, value] of entries) {
    if (value !== undefined) {
      target[key] = value;
    }
  }
}

function resolveCapturedLabel(
  a11y: FzAssistantA11yRead,
  snapshotLabel: string | undefined,
  emptyFallback: string,
): Pick<FzAssistantCapturedElement, 'label' | 'accessibleNameSource'> {
  if (a11y.name !== '') {
    return a11y.nameSource === undefined ? { label: a11y.name } : { label: a11y.name, accessibleNameSource: a11y.nameSource };
  }

  if (snapshotLabel !== undefined && snapshotLabel !== '') {
    return { label: snapshotLabel, accessibleNameSource: 'widget-snapshot' };
  }

  // Synthesized placeholders (e.g. table → "Table") use tag-inference. Ignore a11y.nameSource
  // here: an empty name means that source did not produce the label.
  return emptyFallback !== '' ? { label: emptyFallback, accessibleNameSource: 'tag-inference' } : { label: emptyFallback };
}

/**
 * Shared Feverzone typeahead hosts (`app-typeahead` / `ignt-typeahead`).
 * Discover walks light DOM — floating/field label for name, typed/selected input value for selection —
 * without requiring {@link FzAssistantCapable} on the shared component.
 *
 * Placeholder is not treated as a selection: shared typeaheads bind it to `selectAllLabel` or
 * `emptyLabel`, so an empty model (including "All") leaves the input blank and only shows the prompt.
 */
function isSharedTypeaheadHost(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return tag === 'app-typeahead' || tag === 'ignt-typeahead';
}

function mapSharedTypeaheadFromDom(args: {
  a11y: FzAssistantA11yRead;
  captureError: FzAssistantCapturedElement['capture_error'];
  element: Element;
  label: string;
  accessibleNameSource: FzAssistantCapturedElement['accessibleNameSource'];
  ref: string;
}): FzAssistantCapturedElement {
  const { a11y, captureError, element, ref } = args;
  const input = findSharedTypeaheadInput(element);
  const floatingLabel = readSharedTypeaheadFloatingLabel(element);

  // Prefer the visual field label over AccName (often the placeholder "All …" / emptyLabel).
  const label =
    floatingLabel !== ''
      ? floatingLabel
      : args.label !== ''
        ? args.label
        : input !== undefined
          ? normalizeText(input.getAttribute('placeholder'))
          : '';
  const accessibleNameSource =
    floatingLabel !== '' ? 'tag-inference' : args.accessibleNameSource !== undefined ? args.accessibleNameSource : undefined;

  // Only the formatted selection in the input is a real value. Placeholder is selectAllLabel /
  // emptyLabel and must not be reported as selected (e.g. "Partners", "Select an option").
  const value = input !== undefined ? normalizeText(input.value) : '';

  const captured: FzAssistantCapturedElement = {
    ref,
    type: 'select',
    label,
    widget: element.tagName.toLowerCase(),
  };

  assignDefined(captured, [
    ['value', value !== '' ? value : undefined],
    // The same two predicates the native branch and the write path read. Reading them differently
    // here made one control's `disabled` depend on which branch happened to capture it.
    ['isDisabled', input !== undefined && isFzAssistantElementUnavailable(input) ? true : undefined],
    ['isReadonly', input !== undefined && isFzAssistantElementReadonly(input) ? true : undefined],
    ['role', a11y.role !== '' ? a11y.role : 'combobox'],
    ['accessibleNameSource', accessibleNameSource],
    ['capture_error', captureError],
  ]);

  return captured;
}

function findSharedTypeaheadInput(host: Element): HTMLInputElement | undefined {
  const byTestId = host.querySelector('input[data-testid="typeahead-input"]');
  if (byTestId instanceof HTMLInputElement) {
    return byTestId;
  }

  const byClass = host.querySelector('input.typeahead-input, input.field__select--typeahead');
  if (byClass instanceof HTMLInputElement) {
    return byClass;
  }

  const first = host.querySelector('input');
  return first instanceof HTMLInputElement ? first : undefined;
}

function readSharedTypeaheadFloatingLabel(host: Element): string {
  const floating = host.querySelector('.typeahead-floating-label, .field__label');
  return floating !== null ? normalizeText(floating.textContent) : '';
}

/**
 * The Ignite editor body is `div.ProseMirror[contenteditable]` — not a native candidate by
 * default, and its toolbar buttons are noise. Discover treats the host as one text leaf.
 */
function isRichTextEditorLeaf(element: Element): boolean {
  return element.tagName.toLowerCase() === 'ignt-rich-text-editor';
}

function mapRichTextEditorFromDom(args: {
  a11y: FzAssistantA11yRead;
  captureError: FzAssistantCapturedElement['capture_error'];
  element: Element;
  label: string;
  accessibleNameSource: FzAssistantCapturedElement['accessibleNameSource'];
  ref: string;
}): FzAssistantCapturedElement {
  const { a11y, captureError, element, ref } = args;
  const body = resolveRichTextEditorBody(element);
  const fieldLabel = readRichTextNearbyFieldLabel(element);
  const label = fieldLabel !== '' ? fieldLabel : args.label !== '' ? args.label : 'Rich text';
  const accessibleNameSource = fieldLabel !== '' || args.label === '' ? 'tag-inference' : args.accessibleNameSource;

  const value = normalizeText(readRichTextEditorValue(body));
  const { isDisabled, isReadonly } = readRichTextEditorState(element, body);

  const captured: FzAssistantCapturedElement = {
    ref,
    type: 'text',
    label,
    widget: 'ignt-rich-text-editor',
  };

  assignDefined(captured, [
    ['value', value !== '' ? value : undefined],
    ['isDisabled', isDisabled ? true : undefined],
    ['isReadonly', isReadonly ? true : undefined],
    ['role', a11y.role !== '' ? a11y.role : 'textbox'],
    ['accessibleNameSource', accessibleNameSource],
    ['capture_error', captureError],
  ]);

  return captured;
}

/**
 * The editable body, or the source-view textarea when the editor shows raw HTML instead.
 * Queried separately rather than as one selector list: a list resolves by document order,
 * so any unrelated `textarea` rendered above the body would win.
 */
function resolveRichTextEditorBody(host: Element): Element | undefined {
  return host.querySelector('.ProseMirror[contenteditable]') ?? host.querySelector('textarea') ?? undefined;
}

/**
 * Source-view values stay raw on purpose: the textarea is what the user is editing, so its
 * literal content is the field value, the same way any other textarea is captured. Only the
 * rendered body is flattened to plain text.
 */
function readRichTextEditorValue(body: Element | undefined): string {
  if (body === undefined) {
    return '';
  }

  return body instanceof HTMLTextAreaElement ? body.value : readRichTextPlainText(body);
}

/**
 * The editor publishes readonly, disabled and busy separately on its host, because
 * `contenteditable="false"` on its own also covers a form-disabled control and one that is
 * briefly locked while an image uploads. Hosts that publish nothing fall back to the body,
 * which can only tell whether editing is blocked.
 */
function readRichTextEditorState(host: Element, body: Element | undefined): { isDisabled: boolean; isReadonly: boolean } {
  // The shared predicate, not `aria-disabled` alone: a bare `disabled` attribute on the host, or a
  // `<fieldset disabled>` around it, is a state the write path refuses, so publishing the editor as
  // operable there would be the one mismatch this predicate exists to prevent.
  const isDisabled = isFzAssistantElementUnavailable(host);
  const publishesState = isDisabled || host.hasAttribute('aria-readonly') || host.hasAttribute('aria-busy');
  const isReadonly = publishesState ? host.getAttribute('aria-readonly') === 'true' : isRichTextEditorBodyReadonly(body);

  return { isDisabled, isReadonly };
}

function isRichTextEditorBodyReadonly(body: Element | undefined): boolean {
  if (body instanceof HTMLTextAreaElement) {
    return body.readOnly;
  }

  return body?.getAttribute('contenteditable') === 'false';
}

/**
 * Flatten editor HTML to plain text. Inject spaces around block nodes so jsdom
 * (weak `innerText`) and browsers both produce readable agent values.
 */
function readRichTextPlainText(editor: Element): string {
  const clone = editor.cloneNode(true) as Element;
  const blocks = clone.querySelectorAll('p, div, li, br, h1, h2, h3, h4, h5, h6');
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks.item(index);
    if (block === null) {
      continue;
    }

    if (block.tagName.toLowerCase() === 'br') {
      block.replaceWith(editor.ownerDocument.createTextNode(' '));
      continue;
    }

    block.append(editor.ownerDocument.createTextNode(' '));
  }

  return normalizeText(clone.textContent);
}

/** Prefer a sibling/ancestor field label (e.g. plan content "Description") over empty AccName. */
function readRichTextNearbyFieldLabel(host: Element): string {
  const previous = host.previousElementSibling;
  if (previous !== null) {
    const previousText = normalizeText(previous.textContent);
    if (previousText !== '' && previousText.length <= 80) {
      return previousText;
    }
  }

  const labeledAncestor = host.closest('[aria-label], [aria-labelledby]');
  if (labeledAncestor !== null) {
    const ariaLabel = normalizeText(labeledAncestor.getAttribute('aria-label'));
    if (ariaLabel !== '') {
      return ariaLabel;
    }
  }

  return '';
}

function normalizeText(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}
