import { SessionTypeTranslationItem } from '../components/plan-edition/plan-translations-edition/translation-content/translation-content.component';
import { PlanSessionType } from '../models/plan-session-types.model';
import { SessionTypeTranslation } from '../models/session-type-translation.model';
import { findSessionTypeTranslationForEditor } from './session-type-translation.util';

export interface DefaultTranslationSessionTypeItemsInput {
  language: string;
  planSessionTypes: readonly PlanSessionType[];
  sessionTypeTranslationsByEntityId: ReadonlyMap<number, readonly SessionTypeTranslation[]>;
  channelId?: string | null;
}

export function buildDefaultTranslationSessionTypeItems(input: DefaultTranslationSessionTypeItemsInput): SessionTypeTranslationItem[] {
  const channelId = input.channelId ?? null;
  return input.planSessionTypes.map((sessionType: PlanSessionType): SessionTypeTranslationItem => {
    const translations = input.sessionTypeTranslationsByEntityId.get(sessionType.id) ?? [];
    const translation = findSessionTypeTranslationForEditor(translations, input.language, channelId);
    return {
      channelId,
      channels: [...(sessionType.channels ?? [])],
      details: translation?.details ?? '',
      displayName: sessionType.label,
      entityId: sessionType.id,
      instructions: translation?.instructions ?? '',
      isExpanded: false,
      label: translation?.label ?? '',
      published: sessionType.published ?? false,
    };
  });
}
