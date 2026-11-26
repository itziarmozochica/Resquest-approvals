import { ChatbotClientToolCall, ChatbotHostEvent, ChatbotHostEventType } from '../../models/chatbot/chatbot.model';

interface ToolCallAccumulator {
  readonly deltas: readonly string[];
  readonly hasEnd: boolean;
  readonly hasStart: boolean;
  readonly toolCallName?: string;
}

/**
 * Assembles complete AG-UI TOOL_CALL triads from poll `hostEvents` into fulfillment-ready tool calls.
 * Incomplete triads are skipped (poll may still be streaming args). Dedupes by `toolCallId`.
 * Events with an empty `toolCallId` are dropped — BE may synthesize `""`, which is not unique and
 * would collapse distinct calls in the facade's `fulfilledToolCallIds` set (unsafe once mutating
 * tools like `execute_ui_actions` / `act` share this path).
 * Presence of those empty-id triads is still detectable via {@link hostEventsContainCompleteClientToolTriad}
 * so tool-terminal COMPLETED polls can quiet-ERROR remap without toasting.
 */
export function parseClientToolCallsFromHostEvents(hostEvents: readonly ChatbotHostEvent[] | undefined): ChatbotClientToolCall[] {
  if (hostEvents === undefined || hostEvents.length === 0) {
    return [];
  }

  // Mutate a single Map across events — O(n) for long streams (avoid copying Map per event).
  const byId = new Map<string, ToolCallAccumulator>();
  const order: string[] = [];

  for (const event of hostEvents) {
    // BE `_synthesize_host_events` falls back to ""; empty ids are not unique — skip for fulfill.
    if (event.toolCallId === '') {
      continue;
    }

    const existing = byId.get(event.toolCallId);
    if (existing === undefined) {
      order.push(event.toolCallId);
      byId.set(event.toolCallId, applyHostEvent({ deltas: [], hasEnd: false, hasStart: false }, event));
      continue;
    }

    byId.set(event.toolCallId, applyHostEvent(existing, event));
  }

  return order.flatMap((toolCallId): ChatbotClientToolCall[] => {
    const accumulator = byId.get(toolCallId);
    if (accumulator === undefined || !accumulator.hasStart || !accumulator.hasEnd || accumulator.toolCallName === undefined) {
      return [];
    }

    const parsedArgs = parseToolCallArgs(accumulator.deltas.join(''));
    return [
      {
        args: parsedArgs.args,
        toolCallId,
        toolCallName: accumulator.toolCallName,
        ...(parsedArgs.error !== undefined ? { argsParseError: parsedArgs.error } : {}),
      },
    ];
  });
}

/**
 * True when `hostEvents` contain at least one complete TOOL_CALL triad (start + end + name),
 * including BE-synthesized empty `toolCallId`s that {@link parseClientToolCallsFromHostEvents} drops.
 * Used for quiet COMPLETED→ERROR remap when tools cannot be fulfilled.
 */
export function hostEventsContainCompleteClientToolTriad(hostEvents: readonly ChatbotHostEvent[] | undefined): boolean {
  if (hostEvents === undefined || hostEvents.length === 0) {
    return false;
  }

  const byId = new Map<string, ToolCallAccumulator>();
  for (const event of hostEvents) {
    const existing = byId.get(event.toolCallId) ?? { deltas: [], hasEnd: false, hasStart: false };
    byId.set(event.toolCallId, applyHostEvent(existing, event));
  }

  for (const accumulator of byId.values()) {
    if (accumulator.hasStart && accumulator.hasEnd && accumulator.toolCallName !== undefined) {
      return true;
    }
  }

  return false;
}

function applyHostEvent(accumulator: ToolCallAccumulator, event: ChatbotHostEvent): ToolCallAccumulator {
  switch (event.type) {
    case ChatbotHostEventType.TOOL_CALL_START:
      return {
        ...accumulator,
        hasStart: true,
        toolCallName: event.toolCallName,
      };
    case ChatbotHostEventType.TOOL_CALL_ARGS:
      return {
        ...accumulator,
        deltas: [...accumulator.deltas, event.delta],
      };
    case ChatbotHostEventType.TOOL_CALL_END:
      return {
        ...accumulator,
        hasEnd: true,
      };
    default:
      return accumulator;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseToolCallArgs(rawArgs: string): { args: Record<string, unknown>; error?: string } {
  const trimmed = rawArgs.trim();
  if (trimmed.length === 0) {
    return { args: {} };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      return { args: {}, error: 'Tool call args must be a JSON object' };
    }
    return { args: parsed };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid JSON in tool call args';
    return { args: {}, error: message };
  }
}
