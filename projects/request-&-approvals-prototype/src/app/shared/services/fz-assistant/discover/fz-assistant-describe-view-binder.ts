import { inject, Injectable } from '@angular/core';

import { ChatbotClientToolCall, ChatbotClientToolError } from '@fz-original/app/shared/models/chatbot/chatbot.model';
import { FZ_ASSISTANT_DESCRIBE_VIEW_TOOL } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';
import { DescribeViewArgs } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';
import {
  ChatbotClientToolFulfillmentService,
  ChatbotClientToolHandlerResult,
} from '@fz-original/app/shared/services/chatbot/chatbot-client-tool-fulfillment.service';

import { FzAssistantDiscoverFacade } from './fz-assistant-discover.facade';

/**
 * Registers `describe_view` with the client-tool fulfillment map at bootstrap.
 * Lifecycle is owned here, not by the poll loop — so any caller that fulfills hostEvents
 * finds the handler without ChatbotFacade coupling.
 */
@Injectable({
  providedIn: 'root',
})
export class FzAssistantDescribeViewBinder {
  readonly #discoverFacade = inject(FzAssistantDiscoverFacade);
  readonly #fulfillment = inject(ChatbotClientToolFulfillmentService);

  constructor() {
    this.#fulfillment.register(FZ_ASSISTANT_DESCRIBE_VIEW_TOOL, (toolCall: ChatbotClientToolCall) => this.#handle(toolCall));
  }

  #handle(toolCall: ChatbotClientToolCall): ChatbotClientToolHandlerResult {
    const parsedArgs = parseDescribeViewArgs(toolCall.args);
    if (parsedArgs.ok === false) {
      // Malformed scope must not fall back to a full-view capture (study: typed tool errors,
      // not silent over-capture). Same posture as hostEvents JSON → invalid_tool_args.
      return {
        error: ChatbotClientToolError.INVALID_TOOL_ARGS,
        hint: parsedArgs.hint,
        success: false,
      };
    }

    const capture = this.#discoverFacade.tryBuildViewContext(parsedArgs.args);
    if (capture.ok === false) {
      // Unresolvable scope → typed failure (not success + empty elements). Backend/agent can
      // distinguish "scope missing" from "page has no interactives" / non-instrumented baseline.
      return {
        error: ChatbotClientToolError.NO_MATCH,
        hint: capture.hint,
        success: false,
      };
    }

    return {
      manifest: capture.viewContext,
      success: true,
    };
  }
}

type ParsedDescribeViewArgs = { ok: true; args: DescribeViewArgs | undefined } | { ok: false; hint: string };

function parseDescribeViewArgs(args: Record<string, unknown>): ParsedDescribeViewArgs {
  if (!Object.prototype.hasOwnProperty.call(args, 'scope')) {
    return { ok: true, args: undefined };
  }

  const scope = args['scope'];
  if (typeof scope !== 'string') {
    return { ok: false, hint: 'describe_view scope must be a string when provided' };
  }

  return { ok: true, args: { scope } };
}
