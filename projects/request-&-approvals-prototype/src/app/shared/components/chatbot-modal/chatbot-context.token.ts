import { InjectionToken } from '@angular/core';

import { ChatbotContextET } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/chatbot-context';

export const CHATBOT_CONTEXT = new InjectionToken<ChatbotContextET>('CHATBOT_CONTEXT');
