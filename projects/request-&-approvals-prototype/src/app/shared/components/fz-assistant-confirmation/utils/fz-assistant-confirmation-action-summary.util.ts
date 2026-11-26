import { FzAssistantConfirmationDialogData } from '@fz-original/app/shared/components/fz-assistant-confirmation/models/fz-assistant-confirmation-dialog-data.model';

/** A translation key plus the values it interpolates, so the summary is composed by `translate`, never by string concatenation. */
export interface FzAssistantConfirmationActionSummary {
  key: string;
  params: { target: string; value?: string };
}

const TRANSLATION_PREFIX = 'chatbot.confirmation.action';

/**
 * A plain-language line for the step itself, beside the agent's own message.
 *
 * Returns the key rather than the sentence: the Partner may be reading in any of the locales the portal
 * ships, and a commit gate is the last surface that should fall back to English.
 */
export function readActionSummary(data: FzAssistantConfirmationDialogData, fallbackTarget: string): FzAssistantConfirmationActionSummary {
  const params = { target: data.targetLabel ?? fallbackTarget, value: data.proposedValue };

  switch (data.op) {
    case 'submit':
      return { key: data.targetLabel === undefined ? `${TRANSLATION_PREFIX}.submitForm` : `${TRANSLATION_PREFIX}.submitWith`, params };
    case 'click':
      return { key: `${TRANSLATION_PREFIX}.select`, params };
    case 'trigger':
      return { key: `${TRANSLATION_PREFIX}.run`, params };
    case 'navigate':
      return { key: `${TRANSLATION_PREFIX}.goTo`, params };
    case 'fill':
    case 'select':
    case 'select_many':
      return { key: data.proposedValue === undefined ? `${TRANSLATION_PREFIX}.change` : `${TRANSLATION_PREFIX}.setValue`, params };
    default:
      // The op union is frozen by §3.5, so this is unreachable today. It stays because the alternative
      // failure mode is a blank line in front of a Partner who is about to approve a commit.
      return { key: `${TRANSLATION_PREFIX}.change`, params };
  }
}
