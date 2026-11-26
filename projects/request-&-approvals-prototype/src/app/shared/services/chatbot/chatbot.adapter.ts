import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { OpenChatbotEntryPointET } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/open-chatbot.event';
import { FzAssistantViewContext } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';

import { BaseResponse } from '../../models/base-response';
import {
  ChatbotActionResult,
  ChatbotActionResultDTO,
  ChatbotActionResultsRequest,
  ChatbotActionResultsRequestDTO,
  ChatbotActionResultsResponse,
  ChatbotActionResultsResponseDTO,
  ChatbotChartConfig,
  ChatbotChartConfigDTO,
  ChatbotInitResponse,
  ChatbotInitResponseDTO,
  ChatbotPromptVersion,
  ChatbotRequest,
  ChatbotRunOutput,
  ChatbotRunOutputDTO,
  ChatbotRunStatus,
  ChatbotRunTimeoutDetailDTO,
  ChatbotRunTimeoutResponseDTO,
} from '../../models/chatbot/chatbot.model';
import { buildTimeoutMessage, fromChatbotMessageDto } from '../../utils/chatbot.util';

const RUN_TIMED_OUT_CODE: ChatbotRunTimeoutDetailDTO['code'] = 'run_timed_out';

export interface ChatbotToApiParams {
  message: string;
  userEmail: string;
  entryPoint?: OpenChatbotEntryPointET;
  notificationId?: string | null;
  profileId?: string;
  promptVersion?: ChatbotPromptVersion;
  threadId?: string | null;
  viewContext?: FzAssistantViewContext;
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotAdapter {
  fromActionResultsApi(response: ChatbotActionResultsResponseDTO | null): ChatbotActionResultsResponse | null {
    // Same wire shape as init today; dedicated entry point so divergence is a local change.
    // Continuations must carry non-empty ids — `{}` / missing fields must not become
    // `{ runId: undefined }` and keep the poll loop alive on a broken run.
    if (response === null) {
      return null;
    }

    const runId = typeof response.run_id === 'string' ? response.run_id.trim() : '';
    const threadId = typeof response.thread_id === 'string' ? response.thread_id.trim() : '';
    if (runId === '' || threadId === '') {
      return null;
    }

    return { runId, threadId };
  }

  fromChartConfigApi(response: BaseResponse<ChatbotChartConfigDTO> | null): ChatbotChartConfig | null {
    if (!response?.data) {
      return null;
    }

    return {
      data: response.data.data,
      type: response.data.type,
    };
  }

  fromInitResponseApi(response: BaseResponse<ChatbotInitResponseDTO> | null): ChatbotInitResponse | null {
    if (!response?.data) {
      return null;
    }

    return {
      runId: response.data.run_id,
      threadId: response.data.thread_id,
    };
  }

  fromRunOutputApi(response: BaseResponse<ChatbotRunOutputDTO> | null): ChatbotRunOutput | null {
    if (!response?.data) {
      return null;
    }

    const output: ChatbotRunOutput = {
      messages: response.data.messages?.map(fromChatbotMessageDto) ?? null,
      runId: response.data.run_id,
      status: response.data.status,
      threadId: response.data.thread_id,
    };

    if (response.data.hostEvents !== undefined) {
      output.hostEvents = response.data.hostEvents;
    }

    return output;
  }

  toActionResultsApi(params: ChatbotActionResultsRequest): ChatbotActionResultsRequestDTO {
    const payload: ChatbotActionResultsRequestDTO = {
      results: params.results.map(result => this.#mapActionResultToDto(result)),
      thread_id: params.threadId,
    };

    if (params.runId !== undefined) {
      payload.runId = params.runId;
    }

    return payload;
  }

  fromRunTimeoutErrorApi(error: HttpErrorResponse, fallbackRunId: string): ChatbotRunOutput | null {
    const detail: Partial<ChatbotRunTimeoutDetailDTO> | undefined = this.#extractTimeoutDetail(error);

    if (detail?.code !== RUN_TIMED_OUT_CODE) {
      return null;
    }

    const runId: string = typeof detail.run_id === 'string' ? detail.run_id : fallbackRunId;
    const threadId: string | null = typeof detail.thread_id === 'string' ? detail.thread_id : null;
    const message: string | null = typeof detail.message === 'string' && detail.message.trim().length > 0 ? detail.message : null;

    return {
      messages: message ? [buildTimeoutMessage(runId, message)] : null,
      runId,
      status: ChatbotRunStatus.TIMED_OUT,
      threadId,
    };
  }

  toApi(params: ChatbotToApiParams): ChatbotRequest {
    const payload: ChatbotRequest = { message: params.message, user_email: params.userEmail };
    if (params.entryPoint) {
      payload.entry_point = params.entryPoint;
    }
    if (params.notificationId) {
      payload.id_notification = params.notificationId;
    }
    if (params.profileId) {
      payload.profile_id = params.profileId;
    }
    if (params.promptVersion) {
      payload.prompt_version = params.promptVersion;
    }
    if (params.threadId) {
      payload.thread_id = params.threadId;
    }
    if (params.viewContext !== undefined) {
      payload.view_context = params.viewContext;
    }
    return payload;
  }

  #extractTimeoutDetail(error: HttpErrorResponse): Partial<ChatbotRunTimeoutDetailDTO> | undefined {
    const body: unknown = error.error;
    if (!body || typeof body !== 'object') {
      return undefined;
    }

    const detail: unknown = (body as Partial<ChatbotRunTimeoutResponseDTO>).detail;
    if (!detail || typeof detail !== 'object') {
      return undefined;
    }

    return detail as Partial<ChatbotRunTimeoutDetailDTO>;
  }

  #mapActionResultToDto(result: ChatbotActionResult): ChatbotActionResultDTO {
    const mapped: ChatbotActionResultDTO = {
      success: result.success,
      toolCallId: result.toolCallId,
    };

    if (result.error !== undefined) {
      mapped.error = result.error;
    }
    if (result.hint !== undefined) {
      mapped.hint = result.hint;
    }
    if (result.manifest !== undefined) {
      mapped.manifest = result.manifest;
    }
    if (result.act !== undefined) {
      mapped.act = result.act;
    }

    return mapped;
  }
}
