import { moveItemInArray } from '@angular/cdk/drag-drop';

import { GENERAL_SETTINGS_ID } from '../models/immersive-content-plan-editor.model';
import type { ModuleArrayDescriptor } from '../models/immersive-layout-descriptor.model';
import { getDescriptor } from '../models/immersive-layout-descriptor.registry';
import type { ImmersiveLayoutDocument, ImmersiveLayoutModule, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import {
  collectModuleFields,
  extractTokens,
  findFieldDescriptor,
  resolveArrayGroups,
  tokenFieldNamesOf,
  tokenOf,
  type CollectedField,
} from './immersive-layout-field.util';
import {
  collectEditableModules,
  findEditableModule,
  parseEditableModuleKey,
  resolveDocumentPropPath,
} from './immersive-layout-general-settings.util';
import { applyAtPath, omitAtPath } from './immersive-layout-patch.util';
import { effectiveModuleItems, parseModulePropPath, readPropValue, valuesEqual } from './immersive-layout-prop-path.util';

export type PublishDiffKind = 'array' | 'base_locale' | 'copy' | 'general' | 'module' | 'prop' | 'reorder' | 'theme';

// The last item/module identity the store saw the editor drag, keyed by `${moduleId}/${groupPath}`
// for an item group or the literal `'modules'` for the module list. The diff engine only ever reads
// it to break an otherwise-ambiguous tie (an adjacent transposition, or fewer than two items in a
// group) — it never overrides a move the data itself already resolves.
export type ReorderHints = Record<string, string>;

// A value-level difference between the committed layout and the working one. Deliberately free of
// any human label: the unsaved-change counter recomputes this on every keystroke, and resolving
// module labels, item titles and translations there made typing quadratic. Labels are attached
// once, on demand, by `labelWorkingChanges`.
export interface WorkingChange {
  kind: PublishDiffKind;
  newValue: ImmersiveLayoutValue | undefined;
  oldValue: ImmersiveLayoutValue | undefined;
  fieldPath?: string;
  groupPath?: string;
  locale?: string;
  moduleId?: string;
  token?: string;
}

export function collectWorkingChanges(
  committed: ImmersiveLayoutDocument,
  working: ImmersiveLayoutDocument,
  hints: ReorderHints = {},
): WorkingChange[] {
  if (committed === working) {
    return [];
  }
  return [
    ...collectTranslationChanges(committed, working),
    ...collectBaseLocaleChange(committed, working),
    ...collectThemeChange(committed, working),
    ...collectGeneralSettingsChanges(committed, working),
    ...collectModuleSetChanges(committed, working),
    ...collectModuleOrderChange(committed, working, hints.modules),
    ...collectModuleChanges(committed, working, hints),
  ];
}

export function countWorkingChanges(committed: ImmersiveLayoutDocument, working: ImmersiveLayoutDocument): number {
  return collectWorkingChanges(committed, working).length;
}

export function hasModuleChanges(
  committed: ImmersiveLayoutDocument,
  working: ImmersiveLayoutDocument,
  moduleId: string,
  moduleTokens: ReadonlySet<string> = new Set(),
): boolean {
  if (moduleId === GENERAL_SETTINGS_ID) {
    return (
      committed.schema.theme_id !== working.schema.theme_id ||
      (committed.base_locale ?? null) !== (working.base_locale ?? null) ||
      collectGeneralSettingsChanges(committed, working).length > 0
    );
  }
  return collectWorkingChanges(committed, working).some(
    change => change.moduleId === moduleId || (change.kind === 'copy' && change.token !== undefined && moduleTokens.has(change.token)),
  );
}

export function patchModuleProp<T extends ImmersiveLayoutDocument>(
  layout: T,
  moduleId: string,
  propPath: string,
  value: ImmersiveLayoutValue,
): T {
  const path = resolveDocumentPropPath(layout, moduleId, propPath);
  if (path === null) {
    return layout;
  }
  if (value === null && omitsWhenEmpty(layout, moduleId, propPath)) {
    // The copy of a token the key pointed at goes with it, or it would linger as an orphan.
    const owned = readPropValue(findEditableModule(layout, moduleId)?.props ?? {}, propPath) ?? null;
    return omitTokenTranslations(omitAtPath(layout, path), owned);
  }
  return applyAtPath(layout, path, value);
}

// Drops, in every locale, the translation of every token `removed` owned.
export function omitTokenTranslations<T extends ImmersiveLayoutDocument>(layout: T, removed: ImmersiveLayoutValue): T {
  const tokens = new Set(extractTokens(removed));
  if (tokens.size === 0) {
    return layout;
  }
  const translations = Object.fromEntries(
    Object.entries(layout.translations).map(([locale, bucket]) => [
      locale,
      Object.keys(bucket).some(token => tokens.has(token))
        ? Object.fromEntries(Object.entries(bucket).filter(([token]) => !tokens.has(token)))
        : bucket,
    ]),
  );
  return { ...layout, translations };
}

export function patchTranslation<T extends ImmersiveLayoutDocument>(layout: T, locale: string, token: string, value: string): T {
  return applyAtPath(layout, ['translations', locale, token], value);
}

// A removed module's tokens go with it (`removeModule`) and an added variant arrives with its cloned
// tokens: the `module` change already reports either, so the copy it took along is not a change of its own.
// An added base module starts empty, so the copy typed into it afterwards is still reported.
function collectTranslationChanges(committed: ImmersiveLayoutDocument, working: ImmersiveLayoutDocument): WorkingChange[] {
  const locales = new Set([...Object.keys(committed.translations), ...Object.keys(working.translations)]);
  const { added, removed } = diffModuleSets(committed, working);
  const addedVariants = added.filter(module => parseEditableModuleKey(module.id).channelId !== null);
  const moduleSetTokens = new Set([...addedVariants, ...removed].flatMap(module => extractTokens(module.props)));

  return [...locales].flatMap(locale => {
    const committedBucket = committed.translations[locale] ?? {};
    const workingBucket = working.translations[locale] ?? {};
    const tokens = new Set([...Object.keys(committedBucket), ...Object.keys(workingBucket)]);
    return [...tokens].flatMap(token => {
      if (moduleSetTokens.has(token)) {
        return [];
      }
      const oldValue = committedBucket[token] ?? '';
      const newValue = workingBucket[token] ?? '';
      if (oldValue === newValue) {
        return [];
      }
      return [{ kind: 'copy', locale, newValue, oldValue, token } satisfies WorkingChange];
    });
  });
}

// Base modules and channel variants alike, by editable key.
function diffModuleSets(
  committed: ImmersiveLayoutDocument,
  working: ImmersiveLayoutDocument,
): { added: ImmersiveLayoutModule[]; removed: ImmersiveLayoutModule[] } {
  const committedModules = collectEditableModules(committed);
  const workingModules = collectEditableModules(working);
  const committedIds = new Set(committedModules.map(module => module.id));
  const workingIds = new Set(workingModules.map(module => module.id));
  return {
    added: workingModules.filter(module => !committedIds.has(module.id)),
    removed: committedModules.filter(module => !workingIds.has(module.id)),
  };
}

function collectBaseLocaleChange(committed: ImmersiveLayoutDocument, working: ImmersiveLayoutDocument): WorkingChange[] {
  const oldValue = committed.base_locale ?? null;
  const newValue = working.base_locale ?? null;
  if (oldValue === newValue) {
    return [];
  }
  return [{ fieldPath: 'base_locale', kind: 'base_locale', moduleId: GENERAL_SETTINGS_ID, newValue, oldValue } satisfies WorkingChange];
}

function collectThemeChange(committed: ImmersiveLayoutDocument, working: ImmersiveLayoutDocument): WorkingChange[] {
  const oldValue = committed.schema.theme_id;
  const newValue = working.schema.theme_id;
  if (oldValue === newValue) {
    return [];
  }
  return [{ fieldPath: 'theme_id', kind: 'theme', moduleId: GENERAL_SETTINGS_ID, newValue, oldValue } satisfies WorkingChange];
}

const generalSettingsUrlKeys = ['zone_selector_png_url', 'venue_svg_url'] as const;

function collectGeneralSettingsChanges(committed: ImmersiveLayoutDocument, working: ImmersiveLayoutDocument): WorkingChange[] {
  return generalSettingsUrlKeys.flatMap(fieldPath => {
    const oldValue = committed.schema[fieldPath] ?? null;
    const newValue = working.schema[fieldPath] ?? null;
    return oldValue === newValue
      ? []
      : [{ fieldPath, kind: 'general', moduleId: GENERAL_SETTINGS_ID, newValue, oldValue } satisfies WorkingChange];
  });
}

// Whole-module add/remove, reported before order and field diffs so a document that both gains and
// edits a module (impossible today — a freshly added module starts with `props: {}` — but kept
// order-independent for whenever that changes) never depends on which of the two ran first. Neither
// `collectModuleOrderChange` (guarded by `isUniquePermutation`, which requires equal length) nor
// `collectModuleChanges` (which only walks the modules both documents hold, see `pairModules`) ever
// sees a membership change, so this is its only reporter — and the one thing that
// makes `changeCount` (and therefore the save-draft gate) notice an add/remove whose module carries
// no token field at all, e.g. a freshly added `immersive-links` with no items yet.
function collectModuleSetChanges(committed: ImmersiveLayoutDocument, working: ImmersiveLayoutDocument): WorkingChange[] {
  const { added, removed } = diffModuleSets(committed, working);
  return [
    ...added.map((module): WorkingChange => ({ kind: 'module', moduleId: module.id, newValue: module.type, oldValue: undefined })),
    ...removed.map((module): WorkingChange => ({ kind: 'module', moduleId: module.id, newValue: undefined, oldValue: module.type })),
  ];
}

// Modules pair by `id`, not position, matching `collectModuleChanges`. `hintModuleId` is the id the
// store last saw dragged, read only to break an otherwise-ambiguous tie.
function collectModuleOrderChange(
  committed: ImmersiveLayoutDocument,
  working: ImmersiveLayoutDocument,
  hintModuleId?: string,
): WorkingChange[] {
  const committedIds = committed.schema.modules.map(module => module.id);
  const workingIds = working.schema.modules.map(module => module.id);
  const move = detectSinglePermutationMove(committedIds, workingIds, hintModuleId);
  if (move === null) {
    return [];
  }
  // Positionless: no single splice explains which module moved, so nothing pins it to the mover.
  const moduleId = move.from === undefined ? workingIds[move.anchor] : committedIds[move.from];
  return [{ kind: 'reorder', moduleId, newValue: move.to, oldValue: move.from }];
}

// The modules both documents hold, base and channel variant alike, paired by editable key.
function pairModules(
  committed: ImmersiveLayoutDocument,
  working: ImmersiveLayoutDocument,
): [ImmersiveLayoutModule, ImmersiveLayoutModule][] {
  const committedModules = collectEditableModules(committed);
  return collectEditableModules(working).flatMap((workingModule): [ImmersiveLayoutModule, ImmersiveLayoutModule][] => {
    const committedModule = committedModules.find(module => module.id === workingModule.id);
    return committedModule === undefined ? [] : [[committedModule, workingModule]];
  });
}

function collectModuleChanges(committed: ImmersiveLayoutDocument, working: ImmersiveLayoutDocument, hints: ReorderHints): WorkingChange[] {
  return pairModules(committed, working).flatMap(([committedModule, workingModule]) => {
    const descriptor = getDescriptor(workingModule.type);
    if (descriptor === undefined) {
      return [];
    }

    // Every RESOLVED group's committed and working items are read once here — top-level and every
    // nested child group folded into the row it lives on (`items.0.subitems`): the resize check, the
    // order detection and the identity baseline all work off the same two arrays, whatever depth the
    // group lives at (DR-176).
    const groups = resolveArrayGroups(workingModule, descriptor).map(({ group, groupPath }) => ({
      committedItems: effectiveModuleItems(committedModule, groupPath),
      group,
      groupPath,
      workingItems: effectiveModuleItems(workingModule, groupPath),
    }));

    // A resized group reports one length change and silences its own field rows: the indices no
    // longer line up, so every field below the edit would otherwise read as changed. A resized
    // ANCESTOR silences every group nested under it too — `resolveArrayGroups` visits a group before
    // its own rows' children, so an ancestor's silenced status is already settled by the time its
    // descendants are checked — because comparing a row that did not exist yet (or no longer exists)
    // against the wrong committed row would only invent reorder/prop noise on top of the ancestor's
    // own `array` change.
    const silencedGroupPaths = new Set<string>();
    const arrayChanges: WorkingChange[] = [];
    for (const entry of groups) {
      const underSilencedAncestor = [...silencedGroupPaths].some(path => entry.groupPath.startsWith(`${path}.`));
      if (underSilencedAncestor) {
        silencedGroupPaths.add(entry.groupPath);
        continue;
      }
      if (entry.committedItems.length !== entry.workingItems.length) {
        silencedGroupPaths.add(entry.groupPath);
        arrayChanges.push({
          groupPath: entry.groupPath,
          kind: 'array',
          moduleId: workingModule.id,
          newValue: entry.workingItems.length,
          oldValue: entry.committedItems.length,
        });
      }
    }

    // Skips groups already silenced above — a resize (its own or an ancestor's) already reports its
    // own row, or reports none for a row that did not exist in the committed document.
    const groupOrderResults = groups.flatMap(entry => {
      if (silencedGroupPaths.has(entry.groupPath)) {
        return [];
      }
      const hintKey = hints[`${workingModule.id}/${entry.groupPath}`];
      const result = collectGroupOrderChange(
        workingModule.id,
        entry.group,
        entry.groupPath,
        entry.committedItems,
        entry.workingItems,
        hintKey,
      );
      return result === null ? [] : [{ groupPath: entry.groupPath, ...result }];
    });
    const reorderChanges = groupOrderResults.map(result => result.change);
    const baselineItemsByGroupPath = new Map(groupOrderResults.map(result => [result.groupPath, result.baselineItems] as const));

    const fieldChanges = collectModuleFields(workingModule, descriptor).flatMap(collected => {
      if (collected.groupPath !== undefined && silencedGroupPaths.has(collected.groupPath)) {
        return [];
      }
      // A reordered group compares against its identity-permuted baseline, not the raw committed
      // item at the same index, so a shifted-only row reads as unchanged and a genuine edit still
      // surfaces even though the row it lives on also moved.
      const baselineItems = collected.groupPath === undefined ? undefined : baselineItemsByGroupPath.get(collected.groupPath);
      const oldValue =
        baselineItems === undefined
          ? readPropValue(committedModule.props, collected.path)
          : readBaselineFieldValue(baselineItems, collected);
      const newValue = readPropValue(workingModule.props, collected.path);
      if (valuesEqual(oldValue, newValue)) {
        return [];
      }
      return [
        {
          fieldPath: collected.path,
          groupPath: collected.groupPath,
          kind: 'prop',
          moduleId: workingModule.id,
          newValue,
          oldValue,
        } satisfies WorkingChange,
      ];
    });

    return [...arrayChanges, ...reorderChanges, ...fieldChanges];
  });
}

interface GroupOrderResult {
  baselineItems: readonly ImmersiveLayoutValue[];
  change: WorkingChange;
}

// Item identity is the joined `tokenOf()` of every token field, never resolved text. `hintKey` is
// the identity the store last saw dragged out of this exact group, read only to break a tie.
// `groupPath` is the RESOLVED path (row indices folded in for a nested group, e.g.
// `items.0.subitems`) — never `group.path`, which for a child group is only its static path
// relative to the row it lives on (`subitems`) and would collide across every row of its parent.
function collectGroupOrderChange(
  moduleId: string,
  group: ModuleArrayDescriptor,
  groupPath: string,
  committedItems: readonly ImmersiveLayoutValue[],
  workingItems: readonly ImmersiveLayoutValue[],
  hintKey?: string,
): GroupOrderResult | null {
  const tokenFieldNames = tokenFieldNamesOf(group);
  const committedKeys = committedItems.map(item => itemIdentity(item, tokenFieldNames));
  const workingKeys = workingItems.map(item => itemIdentity(item, tokenFieldNames));
  const move = detectSinglePermutationMove(committedKeys, workingKeys, hintKey);
  if (move === null) {
    return null;
  }
  return {
    baselineItems: permuteByIdentity(committedItems, committedKeys, workingKeys),
    change: { groupPath, kind: 'reorder', moduleId, newValue: move.to, oldValue: move.from },
  };
}

// Missing or non-literal token fields resolve to an empty segment rather than poisoning the whole
// identity: a group where every item is all-empty still collides on the uniqueness check, so a
// tokenless group stays unreorderable (PD1) without a separate null case to carry through the diff.
function itemIdentity(item: ImmersiveLayoutValue, tokenFieldNames: readonly string[]): string {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return tokenFieldNames.map(() => '').join(' ');
  }
  return tokenFieldNames.map(name => tokenOf(item[name]) ?? '').join(' ');
}

// The same identity the diff engine keys reorders on, exposed so the store can record which item it
// just dragged before the move overwrites its position — the one input the diff cannot recover from
// two documents alone.
export function reorderIdentityOf(group: ModuleArrayDescriptor, item: ImmersiveLayoutValue): string {
  return itemIdentity(item, tokenFieldNamesOf(group));
}

// One index pass instead of an `indexOf` scan per row: this runs on every keystroke.
function permuteByIdentity<V>(items: readonly V[], keys: readonly string[], targetOrder: readonly string[]): V[] {
  const itemByKey = new Map(keys.map((key, index) => [key, items[index]] as const));
  return targetOrder.flatMap(key => {
    const item = itemByKey.get(key);
    return item === undefined ? [] : [item];
  });
}

function readBaselineFieldValue(
  baselineItems: readonly ImmersiveLayoutValue[],
  collected: CollectedField,
): ImmersiveLayoutValue | undefined {
  if (collected.itemIndex === undefined || collected.itemField === undefined) {
    return undefined;
  }
  const item = baselineItems[collected.itemIndex];
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return undefined;
  }
  return item[collected.itemField];
}

interface DetectedMove {
  // The first differing index: always known when a permutation is detected, so a positionless
  // module move still has a deterministic row to anchor its label on.
  anchor: number;
  from?: number;
  to?: number;
}

// Shared by module and item order: detects a single-element move by identity, null on no move or
// on any ambiguity (duplicate identities, or the two sides not being a permutation of each other).
// `hintKey` is the identity the store last saw dragged; it only ever breaks a tie between two
// splice hypotheses that both already reproduce the array — it can never manufacture a move the
// data does not already support, and a hint naming neither end of the tie is simply ignored.
function detectSinglePermutationMove(
  committedKeys: readonly string[],
  workingKeys: readonly string[],
  hintKey?: string,
): DetectedMove | null {
  if (!isUniquePermutation(committedKeys, workingKeys)) {
    return null;
  }

  const firstDiff = committedKeys.findIndex((key, index) => key !== workingKeys[index]);
  if (firstDiff === -1) {
    return null;
  }
  let lastDiff = committedKeys.length - 1;
  while (lastDiff > firstDiff && committedKeys[lastDiff] === workingKeys[lastDiff]) {
    lastDiff -= 1;
  }
  if (lastDiff === firstDiff) {
    return null;
  }

  const forwardMatches = matchesSplice(committedKeys, workingKeys, firstDiff, lastDiff);
  const backwardMatches = matchesSplice(committedKeys, workingKeys, lastDiff, firstDiff);
  if (forwardMatches && !backwardMatches) {
    return { anchor: firstDiff, from: firstDiff, to: lastDiff };
  }
  if (backwardMatches && !forwardMatches) {
    return { anchor: firstDiff, from: lastDiff, to: firstDiff };
  }
  if (forwardMatches && backwardMatches) {
    // Adjacent transposition: both splices reproduce the array, so only the editor's own gesture —
    // recorded by the store before the move — can name a direction honestly.
    if (hintKey === committedKeys[firstDiff]) {
      return { anchor: firstDiff, from: firstDiff, to: lastDiff };
    }
    if (hintKey === committedKeys[lastDiff]) {
      return { anchor: firstDiff, from: lastDiff, to: firstDiff };
    }
  }
  // Neither hypothesis matched (multi-move permutation), or the hint named neither end of the tie:
  // the move stays positionless rather than naming a direction the data cannot actually support.
  return { anchor: firstDiff };
}

// Equal length, both sides free of duplicates, and every working key present on the committed side:
// that is exactly a permutation, without sorting either side. Duplicates stay out on purpose — a
// repeated identity makes any move unattributable.
function isUniquePermutation(committedKeys: readonly string[], workingKeys: readonly string[]): boolean {
  const size = committedKeys.length;
  const committedSet = new Set(committedKeys);
  return (
    workingKeys.length === size &&
    committedSet.size === size &&
    new Set(workingKeys).size === size &&
    workingKeys.every(key => committedSet.has(key))
  );
}

// Simulates the move with the very operator the reorder writes use, so the hypothesis can never
// drift from what a drag actually produces.
function matchesSplice(keys: readonly string[], nextKeys: readonly string[], from: number, to: number): boolean {
  const simulated = [...keys];
  moveItemInArray(simulated, from, to);
  return simulated.every((key, index) => key === nextKeys[index]);
}

function omitsWhenEmpty(layout: ImmersiveLayoutDocument, moduleId: string, propPath: string): boolean {
  const module = findEditableModule(layout, moduleId);
  const descriptor = module === null ? undefined : getDescriptor(module.type);
  return descriptor !== undefined && findFieldDescriptor(descriptor, parseModulePropPath(moduleId, propPath))?.omitWhenEmpty === true;
}
