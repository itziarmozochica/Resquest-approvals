import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ChatbotContextET } from './chatbot-context';

export interface DownloadChatbotDatasetData {
  chatbotContext: ChatbotContextET;
  datasetId: string;
}

export const downloadChatbotDataset = defineEvent<DownloadChatbotDatasetData>('download.chatbotDataset');
