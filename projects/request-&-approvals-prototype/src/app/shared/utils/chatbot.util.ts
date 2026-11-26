import { ChatbotMessage, ChatbotMessageDTO, ChatbotMessageType, ChatbotUIContent } from '../models/chatbot/chatbot.model';

export function isChatbotUIMessage(message: ChatbotMessage): message is ChatbotMessage & { content: ChatbotUIContent } {
  return message.type === ChatbotMessageType.UI;
}

export function isChatbotTextMessage(message: ChatbotMessage): message is ChatbotMessage & { content: string } {
  return message.type !== ChatbotMessageType.UI;
}

/** Maps a wire message (`run_id`) to the domain shape (`runId`); `content` (incl. UI `data`) is preserved by reference. */
export function fromChatbotMessageDto(dto: ChatbotMessageDTO): ChatbotMessage {
  return { content: dto.content, id: dto.id, runId: dto.run_id ?? null, type: dto.type };
}

export function buildTimeoutMessage(runId: string, content: string): ChatbotMessage {
  return { content, id: `timeout-${runId}`, runId, type: ChatbotMessageType.AI };
}
