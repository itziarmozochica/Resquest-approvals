import type { ImmersiveLayoutDocument } from '../models/immersive-layout-document.model';
import { DESCRIPTION_MODULE_TYPE } from '../models/immersive-layout-module-type.model';
import type { ImmersivePlanChannel } from '../models/immersive-plan-channel.model';
import { extractTokens, replaceTokens, wrapToken } from './immersive-layout-field.util';
import { collectEditableModules, findEditableModule, toEditableModuleKey } from './immersive-layout-general-settings.util';
import { sanitizeTokenSegment, takenTokens } from './immersive-layout-items.util';
import { omitAtPath } from './immersive-layout-patch.util';
import { omitTokenTranslations } from './immersive-layout-working.util';

export interface ChannelVariantControls {
  addable: ImmersivePlanChannel[];
  variants: string[];
}

export function buildChannelNames(channels: readonly ImmersivePlanChannel[]): Record<string, string> {
  return Object.fromEntries(channels.map(({ id, name }) => [id, name]));
}

export function hasChannelVariants(layout: ImmersiveLayoutDocument | null): boolean {
  return Object.keys(layout?.schema.channel_overrides ?? {}).length > 0;
}

export function listChannelVariants(layout: ImmersiveLayoutDocument, moduleId: string): string[] {
  return Object.entries(layout.schema.channel_overrides ?? {})
    .filter(([, bucket]) => bucket[moduleId] !== undefined)
    .map(([channelId]) => channelId);
}

// Shown to an editor of the description module while there is a channel to add or the module already has
// variants; the flag never hides what is stored, only what can be added.
export function resolveChannelVariantControls(
  layout: ImmersiveLayoutDocument | null,
  moduleId: string,
  channels: readonly ImmersivePlanChannel[],
  { canEdit, isEnabled }: { canEdit: boolean; isEnabled: boolean },
): ChannelVariantControls | null {
  const variants = layout === null ? [] : listChannelVariants(layout, moduleId);
  const isDescription = layout?.schema.modules.find(module => module.id === moduleId)?.type === DESCRIPTION_MODULE_TYPE;
  const addable = isEnabled ? channels.filter(({ id }) => !variants.includes(id)) : [];
  if (!canEdit || !isDescription || (variants.length === 0 && addable.length === 0)) {
    return null;
  }
  return { addable, variants };
}

/**
 * Clones the default module (`sourceChannelId` null) or another variant into a variant for `channelId`,
 * minting every referenced token afresh so editing it never touches the source. `null` when it cannot exist.
 */
export function createChannelVariant<T extends ImmersiveLayoutDocument>(
  layout: T,
  moduleId: string,
  channelId: string,
  sourceChannelId: string | null,
): T | null {
  const base = layout.schema.modules.find(module => module.id === moduleId);
  const source = findEditableModule(layout, toEditableModuleKey(moduleId, sourceChannelId));
  if (base?.type !== DESCRIPTION_MODULE_TYPE || source === null || listChannelVariants(layout, moduleId).includes(channelId)) {
    return null;
  }
  // A token is taken when it has copy or is referenced anywhere, even without copy yet.
  const taken = new Set([
    ...takenTokens(layout.translations),
    ...collectEditableModules(layout).flatMap(module => extractTokens(module.props)),
  ]);
  const renames = new Map<string, string>();
  for (const token of new Set(extractTokens(source.props))) {
    const prefix = `${token}__ch_${sanitizeTokenSegment(channelId)}`;
    let minted = prefix;
    for (let suffix = 2; taken.has(minted); suffix += 1) {
      minted = `${prefix}_${suffix}`;
    }
    taken.add(minted);
    renames.set(token, minted);
  }
  const translations = Object.fromEntries(
    Object.entries(layout.translations).map(([locale, bucket]) => [
      locale,
      {
        ...bucket,
        ...Object.fromEntries([...renames].filter(([token]) => token in bucket).map(([token, minted]) => [minted, bucket[token]])),
      },
    ]),
  );
  const variant = { ...source, id: moduleId, props: replaceTokens(source.props, token => renames.get(token) ?? token) };
  const overrides = layout.schema.channel_overrides ?? {};
  return {
    ...layout,
    schema: { ...layout.schema, channel_overrides: { ...overrides, [channelId]: { ...overrides[channelId], [moduleId]: variant } } },
    translations,
  };
}

export function removeChannelVariant<T extends ImmersiveLayoutDocument>(layout: T, moduleId: string, channelId: string): T | null {
  const overrides = layout.schema.channel_overrides ?? {};
  const { [moduleId]: variant, ...remaining } = overrides[channelId] ?? {};
  if (variant === undefined) {
    return null;
  }
  // The backend rejects empty buckets and the upsert is a full replace: an emptied map leaves the schema.
  const kept = Object.entries({ ...overrides, [channelId]: remaining }).filter(([, bucket]) => Object.keys(bucket).length > 0);
  const next =
    kept.length === 0
      ? omitAtPath(layout, ['schema', 'channel_overrides'])
      : { ...layout, schema: { ...layout.schema, channel_overrides: Object.fromEntries(kept) } };
  // A backend-stored variant may share a token with the default or another variant: only the orphaned ones go.
  const stillReferenced = new Set(collectEditableModules(next).flatMap(module => extractTokens(module.props)));
  const orphaned = extractTokens(variant.props).filter(token => !stillReferenced.has(token));
  return omitTokenTranslations(next, orphaned.map(wrapToken));
}

// A removed base module cannot keep its variants: the backend rejects an override without a base.
export function removeAllChannelVariants<T extends ImmersiveLayoutDocument>(layout: T, moduleId: string): T {
  return listChannelVariants(layout, moduleId).reduce(
    (current, channelId) => removeChannelVariant(current, moduleId, channelId) ?? current,
    layout,
  );
}
