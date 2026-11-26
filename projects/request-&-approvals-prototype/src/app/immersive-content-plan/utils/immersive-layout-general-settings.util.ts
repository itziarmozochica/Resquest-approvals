import { GENERAL_SETTINGS_ID } from '../models/immersive-content-plan-editor.model';
import type { ImmersiveLayoutDocument, ImmersiveLayoutModule, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import { HERO_MODULE_TYPE } from '../models/immersive-layout-module-type.model';
import type { LayoutPatchPath } from './immersive-layout-patch.util';
import { buildModulePropPath, effectiveModuleItems, splitPropPath } from './immersive-layout-prop-path.util';

const CHANNEL_KEY_SEPARATOR = '@';

export interface ModuleGroupTarget {
  items: readonly ImmersiveLayoutValue[];
  path: LayoutPatchPath;
}

/**
 * General settings is a frontend-only pseudo-module: its fields live at `schema.<name>` rather
 * than inside a module's props. Presenting it as an ordinary `ImmersiveLayoutModule` lets the
 * whole collect → view → draft → patch chain treat it like any other module.
 */
export function buildGeneralSettingsModule(layout: ImmersiveLayoutDocument): ImmersiveLayoutModule {
  const { theme_id: themeId, venue_svg_url: venueSvgUrl, zone_selector_png_url: zoneSelectorPngUrl } = layout.schema;
  return {
    id: GENERAL_SETTINGS_ID,
    props: {
      ...(themeId === undefined ? {} : { theme_id: themeId }),
      ...(venueSvgUrl === undefined ? {} : { venue_svg_url: venueSvgUrl }),
      ...(zoneSelectorPngUrl === undefined ? {} : { zone_selector_png_url: zoneSelectorPngUrl }),
    },
    type: GENERAL_SETTINGS_ID,
  };
}

// The hero is what the editor opens on; a layout without one falls back to the general settings.
export function resolveDefaultModuleId(layout: ImmersiveLayoutDocument): string {
  return layout.schema.modules.find(module => module.type === HERO_MODULE_TYPE)?.id ?? GENERAL_SETTINGS_ID;
}

// A channel variant is addressed by the editable key `<moduleId>@<channelId>`; a module id never holds the separator.
export function toEditableModuleKey(moduleId: string, channelId: string | null): string {
  return channelId === null ? moduleId : `${moduleId}${CHANNEL_KEY_SEPARATOR}${channelId}`;
}

export function parseEditableModuleKey(key: string): { channelId: string | null; moduleId: string } {
  const separatorIndex = key.indexOf(CHANNEL_KEY_SEPARATOR);
  return separatorIndex < 0
    ? { channelId: null, moduleId: key }
    : { channelId: key.slice(separatorIndex + 1), moduleId: key.slice(0, separatorIndex) };
}

// The base modules, then every channel variant, each one carrying its editable key as `id`.
export function collectEditableModules(layout: ImmersiveLayoutDocument): ImmersiveLayoutModule[] {
  const variants = Object.entries(layout.schema.channel_overrides ?? {}).flatMap(([channelId, bucket]) =>
    Object.values(bucket).map(module => ({ ...module, id: toEditableModuleKey(module.id, channelId) })),
  );
  return [...layout.schema.modules, ...variants];
}

export function findEditableModule(layout: ImmersiveLayoutDocument, moduleId: string): ImmersiveLayoutModule | null {
  if (moduleId === GENERAL_SETTINGS_ID) {
    return buildGeneralSettingsModule(layout);
  }
  return collectEditableModules(layout).find(module => module.id === moduleId) ?? null;
}

// Where a module's prop path lands inside the raw document, so drafts patch one address space.
export function resolveDocumentPropPath(layout: ImmersiveLayoutDocument, moduleId: string, propPath: string): LayoutPatchPath | null {
  if (moduleId === GENERAL_SETTINGS_ID) {
    return ['schema', ...splitPropPath(propPath)];
  }
  const { channelId, moduleId: baseModuleId } = parseEditableModuleKey(moduleId);
  if (channelId !== null) {
    return layout.schema.channel_overrides?.[channelId]?.[baseModuleId] === undefined
      ? null
      : ['schema', 'channel_overrides', channelId, baseModuleId, 'props', ...splitPropPath(propPath)];
  }
  const moduleIndex = layout.schema.modules.findIndex(module => module.id === moduleId);
  return moduleIndex < 0 ? null : buildModulePropPath(moduleIndex, propPath);
}

// Every write to an array group asks the same three questions: does the module exist, what does the
// group hold right now, and where does it live in the document. One resolver, so add, remove and
// move cannot disagree on when the write is impossible.
export function resolveModuleGroupTarget(layout: ImmersiveLayoutDocument, moduleId: string, groupPath: string): ModuleGroupTarget | null {
  const module = findEditableModule(layout, moduleId);
  if (module === null) {
    return null;
  }
  const path = resolveDocumentPropPath(layout, moduleId, groupPath);
  if (path === null) {
    return null;
  }
  return { items: effectiveModuleItems(module, groupPath), path };
}
