import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { closeChatbot } from './events/close-chatbot.event';
import { downloadChatbotDataset } from './events/download-chatbot-dataset.event';
import { openChatbotHistory } from './events/open-chatbot-history.event';
import { openChatbot } from './events/open-chatbot.event';
import { selectChatbotHistoryThread } from './events/select-chatbot-history-thread.event';
import { sendChatbotMessage } from './events/send-chatbot-message.event';
import { startChatbotNewChat } from './events/start-chatbot-new-chat.event';
import { submitChatbotFeedback } from './events/submit-chatbot-feedback.event';

/**
 * Mixpanel mappers for the Fz Assistant (chatbot) event family.
 *
 * Event names and the snake_case wire shape are preserved exactly from the legacy
 * `src/app/core/tracking` mappers so existing Mixpanel dashboards keep working.
 *
 * Registered via `fzAssistantTrackingProvider` (withMixpanel) on each surface that fires chatbot
 * events: the full-page `/reports/fz-assistant` route and the dialog/dock/notifications overlays.
 */
export const chatbotMixpanelMappers = mixpanelMapper([
  {
    event: openChatbot,
    name: 'open_chatbot',
    properties: ({ chatbotContext, entryPoint, notificationId, notificationType, searchString }) => ({
      chatbot_context: chatbotContext,
      entry_point: entryPoint,
      notification_id: notificationId,
      notification_type: notificationType,
      search_string: searchString,
    }),
  },
  {
    event: closeChatbot,
    name: 'close_chatbot',
    properties: ({ chatbotContext, ...rest }) => ({
      chatbot_context: chatbotContext,
      ...rest,
    }),
  },
  {
    event: sendChatbotMessage,
    name: 'send_chatbot_message',
    properties: ({ chatbotContext, notificationId, notificationType, source }) => ({
      chatbot_context: chatbotContext,
      notification_id: notificationId,
      notification_type: notificationType,
      source,
    }),
  },
  {
    event: submitChatbotFeedback,
    name: 'submit_chatbot_feedback',
    properties: ({ chatbotContext, runId, ...rest }) => ({
      chatbot_context: chatbotContext,
      run_id: runId,
      ...rest,
    }),
  },
  {
    event: downloadChatbotDataset,
    name: 'download_chatbot_dataset',
    properties: ({ chatbotContext, datasetId }) => ({
      chatbot_context: chatbotContext,
      dataset_id: datasetId,
    }),
  },
  {
    event: openChatbotHistory,
    name: 'open_chatbot_history',
    properties: ({ chatbotContext }) => ({
      chatbot_context: chatbotContext,
    }),
  },
  {
    event: selectChatbotHistoryThread,
    name: 'select_chatbot_history_thread',
    properties: ({ chatbotContext }) => ({
      chatbot_context: chatbotContext,
    }),
  },
  {
    event: startChatbotNewChat,
    name: 'start_chatbot_new_chat',
    properties: ({ chatbotContext }) => ({
      chatbot_context: chatbotContext,
    }),
  },
]);
