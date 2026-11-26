import { Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import {
  ChatbotThread,
  ChatbotThreadDTO,
  ChatbotThreadHistory,
  ChatbotThreadHistoryDTO,
  ChatbotThreadListDTO,
  ChatbotThreadListResponse,
} from '@fz-original/app/shared/models/chatbot/chatbot-thread.model';

@Injectable({
  providedIn: 'root',
})
export class ChatbotThreadsAdapter {
  fromThreadApi(response: BaseResponse<ChatbotThreadDTO> | null): ChatbotThread | null {
    if (!response?.data) {
      return null;
    }
    return this.#mapThread(response.data);
  }

  fromThreadHistoryApi(response: BaseResponse<ChatbotThreadHistoryDTO> | null): ChatbotThreadHistory | null {
    if (!response?.data) {
      return null;
    }

    return {
      messages: response.data.messages.map(msg => ({
        content: msg.content,
        id: msg.id,
        runId: msg.run_id ?? null,
        type: msg.type,
      })),
      nextCursor: response.data.next_cursor,
      threadId: response.data.thread_id,
    };
  }

  fromThreadListApi(response: BaseResponse<ChatbotThreadListDTO> | null): ChatbotThreadListResponse | null {
    if (!response?.data) {
      return null;
    }

    return {
      nextCursor: response.data.next_cursor,
      threads: response.data.threads.map((thread: ChatbotThreadDTO) => this.#mapThread(thread)),
    };
  }

  #mapThread(dto: ChatbotThreadDTO): ChatbotThread {
    return {
      createdAt: dto.created_at,
      id: dto.thread_id,
      read: dto.read ?? true,
      title: dto.title,
      updatedAt: dto.updated_at ?? null,
    };
  }
}
