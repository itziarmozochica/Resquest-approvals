import { IgntIconName, IgntIconVariant } from '@ignite/icon';

/**
 * What clicking a suggestion does instead of sending its text as a prompt. Absent — the common
 * case — means the text IS the prompt. An item that carries one is styled to stand out, because it
 * takes the user somewhere rather than asking the assistant something.
 */
export const ChatbotSuggestionAction = {
  customerService: 'customer-service',
} as const;

export type ChatbotSuggestionActionET = (typeof ChatbotSuggestionAction)[keyof typeof ChatbotSuggestionAction];

export interface ChatbotSuggestionItem {
  iconName: IgntIconName;
  iconVariant: IgntIconVariant;
  text: string;
  action?: ChatbotSuggestionActionET;
  tags?: string[];
}
