import type { ImmersiveLayoutDocument, ImmersiveLayoutModule, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import type { ImmersiveModuleType } from '../models/immersive-layout-module-type.model';
import { removeAllChannelVariants } from './immersive-layout-channel-variants.util';
import { findEditableModule, resolveDefaultModuleId } from './immersive-layout-general-settings.util';
import { isAddableModuleType } from './immersive-layout-module-catalog.util';
import { applyAtPath } from './immersive-layout-patch.util';
import { isFixedModuleSlot } from './immersive-layout-reorder.util';
import { omitTokenTranslations, type ReorderHints } from './immersive-layout-working.util';

const IMMERSIVE_TYPE_PREFIX = 'immersive-';

// A new banner starts as the preset, which hides every other field, and already opens its link in a
// new tab for when the template later switches to `custom`.
const initialPropsByType: Partial<Record<ImmersiveModuleType, ImmersiveLayoutModule['props']>> = {
  'immersive-campaign-banner': { openInNewTab: true, template: 'campaign-preset' },
};

export interface AddModuleResult<T extends ImmersiveLayoutDocument> {
  layout: T;
  moduleId: string;
}

function shortModuleTypeName(type: ImmersiveModuleType): string {
  return type.startsWith(IMMERSIVE_TYPE_PREFIX) ? type.slice(IMMERSIVE_TYPE_PREFIX.length) : type;
}

// `<shortType>-<n>`, the id shape already carried by every fixture in this domain (`hero-1`,
// `faqs-1`, `lineup-1`, `venue-1`, ...). The free slot is checked against every id already on the
// document, not just same-type ones: the backend requires document-wide uniqueness
// (`planview_layout.py` rejects a duplicate id regardless of type).
export function nextModuleId(modules: readonly ImmersiveLayoutModule[], type: ImmersiveModuleType): string {
  const shortName = shortModuleTypeName(type);
  const takenIds = new Set(modules.map(module => module.id));
  let suffix = 1;
  while (takenIds.has(`${shortName}-${suffix}`)) {
    suffix += 1;
  }
  return `${shortName}-${suffix}`;
}

// Appended after every existing module, never inserted: the hero's pinned slot 0 (`isFixedModuleSlot`)
// is therefore never disturbed without needing its own special case here. Props start empty unless
// the type seeds some (`initialPropsByType`): `{}` is the minimal valid payload — every non-logos
// prop the backend declares is nullable and none is required (`planview_layout_schema.py`), so an
// empty module round-trips exactly like a document field the backend already omits, and the editor
// already renders a missing field as empty (see `collectModuleFields`, schema-first). It shows every
// field as a gap until filled, the same as a freshly added item does.
export function addModule<T extends ImmersiveLayoutDocument>(layout: T, type: ImmersiveModuleType): AddModuleResult<T> | null {
  if (!isAddableModuleType(type) || layout.schema.modules.some(module => module.type === type)) {
    return null;
  }

  const id = nextModuleId(layout.schema.modules, type);
  const module: ImmersiveLayoutModule = { id, props: { ...initialPropsByType[type] }, type };
  const nextModules = [...layout.schema.modules, module];
  return {
    layout: applyAtPath(layout, ['schema', 'modules'], nextModules as unknown as ImmersiveLayoutValue), // the module shape travels through unchanged, it just isn't structurally ImmersiveLayoutValue
    moduleId: id,
  };
}

function findRemovableModuleIndex(modules: readonly ImmersiveLayoutModule[], moduleId: string): number {
  const index = modules.findIndex(candidate => candidate.id === moduleId);
  return index === -1 || isFixedModuleSlot(modules[index], index) ? -1 : index;
}

// The hero is never removable (`isFixedModuleSlot`, the same predicate that keeps it from being
// dragged), and neither is the general-settings pseudo-module (not an entry in `schema.modules`).
// Both the Delete button and `removeModule` ask this one rule.
export function canRemoveModule(layout: ImmersiveLayoutDocument, moduleId: string): boolean {
  return findRemovableModuleIndex(layout.schema.modules, moduleId) !== -1;
}

export function removeModule<T extends ImmersiveLayoutDocument>(layout: T, moduleId: string): T | null {
  const modules = layout.schema.modules;
  const index = findRemovableModuleIndex(modules, moduleId);
  if (index === -1) {
    return null;
  }

  const next = applyAtPath(
    layout,
    ['schema', 'modules'],
    modules.filter((_, candidateIndex) => candidateIndex !== index) as unknown as ImmersiveLayoutValue, // same cast as `addModule`
  );
  return removeAllChannelVariants(omitTokenTranslations(next, modules[index].props), moduleId);
}

// A removed module takes its reorder hints with it: the module-list hint that points at it, and
// every item-group hint keyed under its id (`<moduleId>/<arrayPath>`).
export function omitReorderHintsForModule(hints: ReorderHints, moduleId: string): ReorderHints {
  return Object.fromEntries(
    Object.entries(hints).filter(([key, value]) => !(key === 'modules' && value === moduleId) && !key.startsWith(`${moduleId}/`)),
  );
}

// Where the editor lands after deleting the module that was open: the previous row in the panel's
// own VISIBLE order (`buildModuleListViews`, hidden types already excluded) — the same row the
// sidebar itself shows sitting right above the one that just disappeared, so nothing about the
// user's place in the list jumps around beyond the one row that had to go. `previousViews` is read
// BEFORE the removal (the removed row's own index is the whole point), the hero can never be the
// removed row itself (`removeModule` refuses it) but is always a legal landing spot, and the only
// document-derived fallback — an unresolvable id, or a document that somehow has no previous row at
// all — is `resolveDefaultModuleId`'s own rule: the hero, or general settings if even that is gone.
export function resolveSelectionAfterRemoveModule(
  previousViews: readonly { id: string }[],
  removedModuleId: string,
  layoutAfterRemoval: ImmersiveLayoutDocument,
): string {
  const removedIndex = previousViews.findIndex(view => view.id === removedModuleId);
  const previousView = removedIndex > 0 ? previousViews[removedIndex - 1] : undefined;
  return previousView?.id ?? resolveDefaultModuleId(layoutAfterRemoval);
}

// The committed side the editor diffs a module against. A module added in the draft has none yet, so
// it compares against an empty instance of itself: every field reads as blank and unchanged.
export function findCommittedModule(committedLayout: ImmersiveLayoutDocument, module: ImmersiveLayoutModule): ImmersiveLayoutModule {
  return findEditableModule(committedLayout, module.id) ?? { id: module.id, props: {}, type: module.type };
}

// A discard can drop the selected module (one added in the draft): the selection then falls back to
// the document default instead of pointing at nothing.
export function resolveSelectionAfterDiscard(layout: ImmersiveLayoutDocument, selectedModuleId: string): string {
  return findEditableModule(layout, selectedModuleId) === null ? resolveDefaultModuleId(layout) : selectedModuleId;
}
