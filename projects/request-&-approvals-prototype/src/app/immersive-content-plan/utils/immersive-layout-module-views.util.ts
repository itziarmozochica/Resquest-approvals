import type { ImmersiveContentPlanModuleGapView } from '../models/immersive-content-plan-screen-state.model';
import { isHiddenModuleType, isSupportedModuleType } from '../models/immersive-layout-descriptor.registry';
import type { ImmersiveLayoutDocument } from '../models/immersive-layout-document.model';
import { resolveModuleLabel } from './immersive-layout-module-label.util';
import { isFixedModuleSlot } from './immersive-layout-reorder.util';

// The module list the panel renders, one row per visible module, already labelled, counted and
// classified. A hidden module type stays in the document, so each view keeps its real position in
// `layout.schema.modules` (`index`) for a reorder drop to translate back through, and the first
// visible row stays fixed even when a hidden module holds the first real position.
export function buildModuleListViews(
  layout: ImmersiveLayoutDocument,
  gapsByModuleId: Record<string, number>,
  baseLocale: string | null,
): ImmersiveContentPlanModuleGapView[] {
  return layout.schema.modules
    .flatMap((module, index) =>
      isHiddenModuleType(module.type)
        ? []
        : [
            {
              fixed: isFixedModuleSlot(module, index),
              gapCount: gapsByModuleId[module.id] ?? 0,
              id: module.id,
              index,
              label: resolveModuleLabel(module, layout.translations, baseLocale),
              type: module.type,
              unsupported: !isSupportedModuleType(module.type),
            },
          ],
    )
    .map((view, visibleIndex) => (visibleIndex === 0 ? { ...view, fixed: true } : view));
}
