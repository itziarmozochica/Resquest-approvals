import {
  FzAssistantA11yRead,
  FzAssistantAccessibleNameSource,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-captured.model';
import { FZ_ASSISTANT_INTERACTIVE_ARIA_ROLES } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';

export interface ReadFzAssistantA11yOptions {
  snapshotDisplayName?: string;
  nameResolvers?: readonly FzAssistantAccessibleNameResolver[];
  roleResolvers?: readonly FzAssistantAccessibleRoleResolver[];
}

export interface FzAssistantA11yReadContext {
  snapshotDisplayName?: string;
}

export interface FzAssistantAccessibleNameResolver {
  readonly source: FzAssistantAccessibleNameSource;
  resolve(element: Element, context: FzAssistantA11yReadContext): string | undefined;
}

export interface FzAssistantAccessibleRoleResolver {
  readonly id: string;
  resolve(element: Element): string | undefined;
}

type ElementWithComputedA11y = Element & {
  computedName?: unknown;
  computedRole?: unknown;
};

const defaultNameResolvers: readonly FzAssistantAccessibleNameResolver[] = [
  {
    source: 'computedName',
    resolve(element: Element): string | undefined {
      return readComputedString((element as ElementWithComputedA11y).computedName);
    },
  },
  {
    source: 'aria-label',
    resolve(element: Element): string | undefined {
      return readNonEmptyAttribute(element, 'aria-label');
    },
  },
  {
    source: 'aria-labelledby',
    resolve(element: Element): string | undefined {
      return readAriaLabelledBy(element);
    },
  },
  {
    source: 'label-for',
    resolve(element: Element): string | undefined {
      return readLabelFor(element);
    },
  },
  {
    source: 'placeholder',
    resolve(element: Element): string | undefined {
      return readNonEmptyAttribute(element, 'placeholder');
    },
  },
  {
    source: 'title',
    resolve(element: Element): string | undefined {
      return readNonEmptyAttribute(element, 'title');
    },
  },
  {
    source: 'tag-inference',
    resolve(element: Element): string | undefined {
      return asResolvedText(inferNameFromTag(element));
    },
  },
  {
    source: 'widget-snapshot',
    resolve(_element: Element, context: FzAssistantA11yReadContext): string | undefined {
      return asResolvedText(normalizeText(context.snapshotDisplayName));
    },
  },
];

const defaultRoleResolvers: readonly FzAssistantAccessibleRoleResolver[] = [
  {
    id: 'computedRole',
    resolve(element: Element): string | undefined {
      return readComputedString((element as ElementWithComputedA11y).computedRole);
    },
  },
  {
    id: 'role-attribute',
    resolve(element: Element): string | undefined {
      return readNonEmptyAttribute(element, 'role');
    },
  },
  {
    id: 'tag-inference',
    resolve(element: Element): string | undefined {
      return inferRoleFromTag(element);
    },
  },
];

export class FzAssistantA11yReader {
  static readonly defaultNameResolvers = defaultNameResolvers;
  static readonly defaultRoleResolvers = defaultRoleResolvers;

  readonly #nameResolvers: readonly FzAssistantAccessibleNameResolver[];
  readonly #roleResolvers: readonly FzAssistantAccessibleRoleResolver[];

  constructor(options: Pick<ReadFzAssistantA11yOptions, 'nameResolvers' | 'roleResolvers'> = {}) {
    this.#nameResolvers = options.nameResolvers ?? FzAssistantA11yReader.defaultNameResolvers;
    this.#roleResolvers = options.roleResolvers ?? FzAssistantA11yReader.defaultRoleResolvers;
  }

  read(element: Element, options: Pick<ReadFzAssistantA11yOptions, 'snapshotDisplayName'> = {}): FzAssistantA11yRead {
    const context: FzAssistantA11yReadContext = {
      snapshotDisplayName: options.snapshotDisplayName,
    };

    return {
      ...this.#resolveName(element, context),
      role: this.#resolveRole(element),
    };
  }

  #resolveName(element: Element, context: FzAssistantA11yReadContext): Pick<FzAssistantA11yRead, 'name' | 'nameSource'> {
    for (const resolver of this.#nameResolvers) {
      const name = resolver.resolve(element, context);
      if (name !== undefined) {
        return { name, nameSource: resolver.source };
      }
    }

    return { name: '' };
  }

  #resolveRole(element: Element): string {
    for (const resolver of this.#roleResolvers) {
      const role = resolver.resolve(element);
      if (role !== undefined) {
        return role;
      }
    }

    return '';
  }
}

export function readFzAssistantA11y(element: Element, options: ReadFzAssistantA11yOptions = {}): FzAssistantA11yRead {
  const { snapshotDisplayName, nameResolvers, roleResolvers } = options;
  return new FzAssistantA11yReader({ nameResolvers, roleResolvers }).read(element, { snapshotDisplayName });
}

function readComputedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return asResolvedText(normalizeText(value));
}

function readNonEmptyAttribute(element: Element, attributeName: string): string | undefined {
  return asResolvedText(normalizeText(element.getAttribute(attributeName)));
}

function readAriaLabelledBy(element: Element): string | undefined {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy === null || labelledBy.trim() === '') {
    return undefined;
  }

  const documentRef = element.ownerDocument;
  const parts: string[] = [];

  for (const id of labelledBy.trim().split(/\s+/)) {
    if (id === '') {
      continue;
    }

    const labelledElement = documentRef.getElementById(id);
    if (labelledElement === null) {
      continue;
    }

    const text = normalizeText(labelledElement.textContent);
    if (text !== '') {
      parts.push(text);
    }
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}

function readLabelFor(element: Element): string | undefined {
  if (isLabellableElement(element) && element.labels !== null && element.labels.length > 0) {
    const fromLabelsApi = joinLabelTexts(element.labels, element);
    if (fromLabelsApi !== undefined) {
      return fromLabelsApi;
    }
  }

  const elementId = element.getAttribute('id');
  if (elementId === null || elementId.trim() === '') {
    return undefined;
  }

  const escapedId = cssEscape(elementId);
  const labels = element.ownerDocument.querySelectorAll(`label[for="${escapedId}"]`);
  return joinLabelTexts(labels, element);
}

/**
 * AccName skips the labeled control when resolving a wrapping `<label>`, so we
 * must not use the label’s full `textContent` (which includes the control).
 */
function joinLabelTexts(labels: ArrayLike<Element>, labeledElement: Element): string | undefined {
  const parts: string[] = [];

  for (let index = 0; index < labels.length; index++) {
    const label = labels[index];
    if (label === undefined) {
      continue;
    }

    const text = normalizeText(collectTextExcluding(label, labeledElement));
    if (text !== '') {
      parts.push(text);
    }
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}

function collectTextExcluding(root: Node, excluded: Element): string {
  return collectVisibleText(root, excluded);
}

/**
 * Walk text nodes under `root`, skipping `excluded` and subtrees that AccName
 * treats as hidden (`aria-hidden="true"`, the `hidden` attribute).
 */
function collectVisibleText(root: Node, excluded?: Element): string {
  let result = '';

  function visit(node: Node): void {
    if (excluded !== undefined && node === excluded) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      result += node.nodeValue ?? '';
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as Element;
    if (element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')) {
      return;
    }

    for (let index = 0; index < node.childNodes.length; index++) {
      const child = node.childNodes[index];
      if (child !== undefined) {
        visit(child);
      }
    }
  }

  visit(root);
  return result;
}

type LabellableElement =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLMeterElement
  | HTMLOutputElement
  | HTMLProgressElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function isLabellableElement(element: Element): element is LabellableElement {
  return (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLMeterElement ||
    element instanceof HTMLOutputElement ||
    element instanceof HTMLProgressElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

/** Caps subtree-inferred names so listbox/combobox hosts cannot dump every option into the label. */
const INFERRED_NAME_MAX_LENGTH = 80;

function inferNameFromSubtree(element: Element): string {
  return truncateInferredName(normalizeText(collectVisibleText(element)));
}

function truncateInferredName(value: string): string {
  if (value.length <= INFERRED_NAME_MAX_LENGTH) {
    return value;
  }

  return `${value.slice(0, INFERRED_NAME_MAX_LENGTH - 1).trimEnd()}…`;
}

function inferNameFromTag(element: Element): string {
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'button' || tagName === 'a') {
    return inferNameFromSubtree(element);
  }

  if (tagName === 'img') {
    return normalizeText(element.getAttribute('alt'));
  }

  if (tagName === 'iframe') {
    const title = normalizeText(element.getAttribute('title'));
    if (title !== '') {
      return title;
    }

    return normalizeText(element.getAttribute('name'));
  }

  if (tagName === 'input' && element instanceof HTMLInputElement) {
    const inputType = element.type.toLowerCase();

    if (inputType === 'submit' || inputType === 'button' || inputType === 'reset') {
      const value = normalizeText(element.getAttribute('value'));
      return value !== '' ? value : inputType;
    }

    if (inputType === 'image') {
      return normalizeText(element.getAttribute('alt'));
    }
  }

  // Best-effort for ARIA hosts (e.g. ignt-tabs `div[role=tab]` → inner span text).
  // Skips aria-hidden / hidden subtrees and caps length (listbox/combobox can wrap many options).
  if (hasInteractiveAriaRole(element)) {
    return inferNameFromSubtree(element);
  }

  return '';
}

const INTERACTIVE_ARIA_ROLES = new Set<string>(FZ_ASSISTANT_INTERACTIVE_ARIA_ROLES);

function hasInteractiveAriaRole(element: Element): boolean {
  const role = element.getAttribute('role');
  if (role === null) {
    return false;
  }

  return INTERACTIVE_ARIA_ROLES.has(role.trim().toLowerCase());
}

function inferRoleFromTag(element: Element): string {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'a':
      return element.hasAttribute('href') ? 'link' : '';
    case 'button':
      return 'button';
    case 'iframe':
      return 'iframe';
    case 'img':
      return 'img';
    case 'meter':
      return 'meter';
    case 'output':
      return 'status';
    case 'progress':
      return 'progressbar';
    case 'select':
      return 'combobox';
    case 'textarea':
      return 'textbox';
    case 'input':
      return inferInputRole(element);
    default:
      return '';
  }
}

function inferInputRole(element: Element): string {
  if (!(element instanceof HTMLInputElement)) {
    return 'textbox';
  }

  switch (element.type.toLowerCase()) {
    case 'button':
    case 'submit':
    case 'reset':
    case 'image':
      return 'button';
    case 'checkbox':
      return 'checkbox';
    case 'radio':
      return 'radio';
    case 'range':
      return 'slider';
    case 'number':
      return 'spinbutton';
    default:
      return 'textbox';
  }
}

function asResolvedText(value: string): string | undefined {
  return value !== '' ? value : undefined;
}

function normalizeText(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
