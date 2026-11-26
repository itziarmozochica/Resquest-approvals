import { defineEvent } from '@fz/fz-tracking/src/public-api';

/**
 * Where the user opened the Zendesk messenger from:
 * - `header`: the header "Chat with us" button, desktop only.
 * - `mobile_menu`: the "Chat with us" item in the hamburger menu on mobile and tablet.
 * - `fz_assistant`: the customer-service suggestion in the FZ Assistant.
 * - `profile_menu`: the "Chat with Partner Support" item in the profile picture menu.
 */
export type CustomerServiceChatEntrypoint = 'fz_assistant' | 'header' | 'mobile_menu' | 'profile_menu';

export interface OpenCustomerServiceChatData {
  entrypoint: CustomerServiceChatEntrypoint;
}

/**
 * The user opened the Zendesk messenger. It marks the hand-off to human customer service, not a
 * message being sent, whichever entry point it came from.
 */
export const openCustomerServiceChat = defineEvent<OpenCustomerServiceChatData>('open.customerServiceChat');
