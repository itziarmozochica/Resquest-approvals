import { Injectable, Type } from '@angular/core';

import { ChatbotUIType } from '../../models/chatbot/chatbot.model';

export type ChatbotUIComponentLoader = () => Promise<Type<unknown>>;

@Injectable({
  providedIn: 'root',
})
export class ChatbotUIRegistryService {
  #registry: ReadonlyMap<ChatbotUIType, ChatbotUIComponentLoader> = new Map<ChatbotUIType, ChatbotUIComponentLoader>([
    [
      ChatbotUIType.CHART,
      () =>
        import(
          '../../components/chatbot-modal/chatbot-conversation/chatbot-message/ui-components/chatbot-chart/chatbot-chart.component'
        ).then(m => m.ChatbotChartComponent),
    ],
    [
      ChatbotUIType.DATASET,
      () =>
        import(
          '../../components/chatbot-modal/chatbot-conversation/chatbot-message/ui-components/chatbot-dataset/chatbot-dataset.component'
        ).then(m => m.ChatbotDatasetComponent),
    ],
    [
      ChatbotUIType.MCP_APP,
      () =>
        import(
          '../../components/chatbot-modal/chatbot-conversation/chatbot-message/ui-components/chatbot-mcp-app/chatbot-mcp-app.component'
        ).then(m => m.ChatbotMcpAppComponent),
    ],
  ]);

  resolve(uiType: ChatbotUIType): ChatbotUIComponentLoader | null {
    return this.#registry.get(uiType) ?? null;
  }
}
