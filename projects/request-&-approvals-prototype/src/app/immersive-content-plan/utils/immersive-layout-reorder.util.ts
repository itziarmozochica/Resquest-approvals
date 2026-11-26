import { moveItemInArray } from '@angular/cdk/drag-drop';

import type { ModuleArrayDescriptor } from '../models/immersive-layout-descriptor.model';
import type { ImmersiveLayoutDocument, ImmersiveLayoutModule, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import { HERO_MODULE_TYPE } from '../models/immersive-layout-module-type.model';
import { tokenFieldNamesOf } from './immersive-layout-field.util';
import { resolveModuleGroupTarget } from './immersive-layout-general-settings.util';
import { applyAtPath } from './immersive-layout-patch.util';

// The hero module always stays first, even if a corrupted document put it elsewhere.
export function isFixedModuleSlot(module: ImmersiveLayoutModule, index: number): boolean {
  return index === 0 || module.type === HERO_MODULE_TYPE;
}

export function isReorderableGroup(group: ModuleArrayDescriptor, itemCount: number): boolean {
  return itemCount >= 2 && tokenFieldNamesOf(group).length > 0;
}

export function moveModule<T extends ImmersiveLayoutDocument>(layout: T, from: number, to: number): T {
  const modules = layout.schema.modules;
  if (!isValidMove(modules.length, from, to)) {
    return layout;
  }
  if (isFixedModuleSlot(modules[from], from) || isFixedModuleSlot(modules[to], to)) {
    return layout;
  }

  const nextModules = [...modules];
  moveItemInArray(nextModules, from, to);
  return applyAtPath(layout, ['schema', 'modules'], nextModules as unknown as ImmersiveLayoutValue); // the module shape travels through unchanged, it just isn't structurally ImmersiveLayoutValue
}

export function moveArrayItem<T extends ImmersiveLayoutDocument>(
  layout: T,
  moduleId: string,
  groupPath: string,
  from: number,
  to: number,
): T {
  const target = resolveModuleGroupTarget(layout, moduleId, groupPath);
  if (target === null || !isValidMove(target.items.length, from, to)) {
    return layout;
  }

  const nextItems = [...target.items];
  moveItemInArray(nextItems, from, to);
  return applyAtPath(layout, target.path, nextItems);
}

function isValidMove(length: number, from: number, to: number): boolean {
  return from !== to && from >= 0 && from < length && to >= 0 && to < length;
}

// The module panel only ever renders VISIBLE modules (a product-hidden module type never reaches
// it — see `buildModuleListViews`), so a drop's `previousIndex`/`currentIndex` are positions in
// that filtered list, not real indexes into `layout.schema.modules`. Every view still carries its
// own real document `index`, so translating a drop back to real indexes is a straight lookup: a
// hidden module sitting between two visible ones simply keeps its own real slot; this never moves
// or otherwise touches it.
export function resolveModuleMoveIndexes(
  views: readonly { index: number }[],
  from: number,
  to: number,
): { from: number; to: number } | null {
  const realFrom = views[from]?.index;
  const realTo = views[to]?.index;
  return realFrom === undefined || realTo === undefined ? null : { from: realFrom, to: realTo };
}
