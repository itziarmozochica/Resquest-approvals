import { inject, Injectable, isDevMode } from '@angular/core';

import { catchError, concatMap, defer, from, isObservable, map, Observable, of, throwError, toArray } from 'rxjs';

import {
  ChatbotActionResult,
  ChatbotActionResultsResponse,
  ChatbotActionResultsResponseDTO,
  ChatbotClientToolCall,
  ChatbotClientToolError,
} from '../../models/chatbot/chatbot.model';
import { ChatbotApiService } from './chatbot-api.service';
import { ChatbotAdapter } from './chatbot.adapter';

/** Handler return without `toolCallId` — the fulfillment service stamps the call id. */
export type ChatbotClientToolHandlerResult = Omit<ChatbotActionResult, 'toolCallId'>;

export type ChatbotClientToolHandler = (
  toolCall: ChatbotClientToolCall,
) => ChatbotClientToolHandlerResult | Promise<ChatbotClientToolHandlerResult> | Observable<ChatbotClientToolHandlerResult>;

export interface ChatbotClientToolFulfillParams {
  runId: string;
  threadId: string;
  /** Same client timeout budget as `initChat` (`TimeoutInterceptor` header). */
  timeoutMs: number;
  toolCalls: readonly ChatbotClientToolCall[];
}

export interface ChatbotClientToolFulfillOutcome {
  continuation: ChatbotActionResultsResponse;
  results: ChatbotActionResult[];
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotClientToolFulfillmentService {
  readonly #chatbotAdapter = inject(ChatbotAdapter);
  readonly #chatbotApiService = inject(ChatbotApiService);
  readonly #handlers = new Map<string, ChatbotClientToolHandler>();

  /**
   * Run each tool call through its registered handler (or a structured unknown-tool error),
   * POST the batch as action-results, and return the continuation run to poll.
   */
  fulfill(partnerId: number, params: ChatbotClientToolFulfillParams): Observable<ChatbotClientToolFulfillOutcome> {
    if (params.toolCalls.length === 0) {
      return throwError(() => new Error('ChatbotClientToolFulfillment.fulfill requires at least one tool call'));
    }

    return from(params.toolCalls).pipe(
      concatMap((toolCall: ChatbotClientToolCall) => this.#executeOne(toolCall)),
      toArray(),
      concatMap((results: ChatbotActionResult[]) => {
        const payload = this.#chatbotAdapter.toActionResultsApi({
          results,
          runId: params.runId,
          threadId: params.threadId,
        });

        return this.#chatbotApiService.postActionResults(partnerId, payload, params.timeoutMs).pipe(
          map((response: ChatbotActionResultsResponseDTO): ChatbotClientToolFulfillOutcome => {
            const continuation = this.#chatbotAdapter.fromActionResultsApi(response);
            if (continuation === null) {
              throw new Error('No continuation run returned from action-results');
            }
            return { continuation, results };
          }),
        );
      }),
    );
  }

  register(toolName: string, handler: ChatbotClientToolHandler): void {
    this.#handlers.set(toolName, handler);
  }

  unregister(toolName: string): void {
    this.#handlers.delete(toolName);
  }

  #executeOne(toolCall: ChatbotClientToolCall): Observable<ChatbotActionResult> {
    if (toolCall.argsParseError !== undefined) {
      return of(this.#failureResult(toolCall, ChatbotClientToolError.INVALID_TOOL_ARGS, toolCall.argsParseError));
    }

    const handler = this.#handlers.get(toolCall.toolCallName);
    if (handler === undefined) {
      const hint = `No client tool handler registered for "${toolCall.toolCallName}"`;
      if (isDevMode()) {
        console.error(`[ChatbotClientToolFulfillment] ${hint}`);
      }
      return of(this.#failureResult(toolCall, ChatbotClientToolError.UNKNOWN_TOOL, hint));
    }

    return defer(() => {
      const result = handler(toolCall);
      if (isObservable(result)) {
        return result;
      }
      return from(Promise.resolve(result));
    }).pipe(
      map(
        (result: ChatbotClientToolHandlerResult): ChatbotActionResult => ({
          ...result,
          toolCallId: toolCall.toolCallId,
        }),
      ),
      catchError((error: unknown) => {
        const hint = error instanceof Error ? error.message : 'Client tool handler failed';
        if (isDevMode()) {
          console.error(`[ChatbotClientToolFulfillment] Handler failed for "${toolCall.toolCallName}"`, error);
        }
        return of(this.#failureResult(toolCall, ChatbotClientToolError.TOOL_EXECUTION_FAILED, hint));
      }),
    );
  }

  #failureResult(toolCall: ChatbotClientToolCall, error: ChatbotClientToolError, hint: string): ChatbotActionResult {
    return {
      error,
      hint,
      success: false,
      toolCallId: toolCall.toolCallId,
    };
  }
}
