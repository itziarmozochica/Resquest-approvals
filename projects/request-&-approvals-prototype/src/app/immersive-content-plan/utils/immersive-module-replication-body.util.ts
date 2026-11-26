import type { ImmersiveLayoutModule, ImmersiveLayoutTranslations } from '../models/immersive-layout-document.model';
import type { ReplicationRequestBody } from '../models/immersive-module-replication.model';
import { extractTokens } from './immersive-layout-field.util';
import { parseEditableModuleKey } from './immersive-layout-general-settings.util';

// The body carries the module and only the translations of the tokens it uses, so a module never
// ships another module's copy to the destination plans. A channel variant (`module.id` is its editable
// key) travels under its base id with the `channel_id` of the override to write.
export function buildReplicationBody(
  module: ImmersiveLayoutModule,
  translations: ImmersiveLayoutTranslations,
  planIds: readonly number[],
): ReplicationRequestBody {
  const { channelId, moduleId } = parseEditableModuleKey(module.id);
  const tokens = new Set(extractTokens(module.props));
  const filteredTranslations: ImmersiveLayoutTranslations = {};
  for (const [locale, bucket] of Object.entries(translations)) {
    const filteredBucket = Object.fromEntries(Object.entries(bucket).filter(([token]) => tokens.has(token)));
    if (Object.keys(filteredBucket).length > 0) {
      filteredTranslations[locale] = filteredBucket;
    }
  }
  const body: ReplicationRequestBody = { module: { ...module, id: moduleId }, plan_ids: [...planIds], translations: filteredTranslations };
  return channelId === null ? body : { ...body, channel_id: channelId };
}
