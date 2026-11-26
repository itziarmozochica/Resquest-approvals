import { FzAssistantExecutionStatus, FzAssistantViewContext, StepResult } from '../fz-assistant/fz-assistant-wire.model';

export const ChatbotMessageType = {
  AI: 'ai',
  HUMAN: 'human',
  UI: 'ui',
} as const;

export type ChatbotMessageType = (typeof ChatbotMessageType)[keyof typeof ChatbotMessageType];

export const ChatbotUIType = {
  CHART: 'chart',
  DATASET: 'dataset',
  MCP_APP: 'mcp_app',
} as const;

export type ChatbotUIType = (typeof ChatbotUIType)[keyof typeof ChatbotUIType];

export const ChatbotPromptVersion = {
  DEVELOPER: 'developer',
  STABLE: 'stable',
} as const;

export type ChatbotPromptVersion = (typeof ChatbotPromptVersion)[keyof typeof ChatbotPromptVersion];

export interface ChatbotPromptVersionsDTO {
  prompt_versions: ChatbotPromptVersion[];
}

export interface ChatbotRequest {
  message: string;
  entry_point?: string;
  id_notification?: string;
  parent_thread_id?: string;
  profile_id?: string;
  prompt_version?: ChatbotPromptVersion;
  thread_id?: string;
  user_email?: string;
  view_context?: FzAssistantViewContext;
}

export interface ChatbotUIContent {
  data: Record<string, unknown>;
  ui_type: ChatbotUIType;
}

interface ChatbotMessageBase {
  content: string | ChatbotUIContent;
  id: string;
  type: ChatbotMessageType;
}

export interface ChatbotMessageDTO extends ChatbotMessageBase {
  run_id?: string | null;
}

export interface ChatbotMessage extends ChatbotMessageBase {
  runId?: string | null;
}

/** Values the backend can return in the poll response's `status` field. */
export const ChatbotRunWireStatus = {
  COMPLETED: 'completed',
  ERROR: 'error',
  PENDING: 'pending',
} as const;

export type ChatbotRunWireStatus = (typeof ChatbotRunWireStatus)[keyof typeof ChatbotRunWireStatus];

/** Domain-level run states: wire states plus the timeout, which the backend expresses as an HTTP 408. */
export const ChatbotRunStatus = {
  ...ChatbotRunWireStatus,
  TIMED_OUT: 'timed_out',
} as const;

export type ChatbotRunStatus = (typeof ChatbotRunStatus)[keyof typeof ChatbotRunStatus];

/** Body of the 408 response from `GET …/chatbot/chat/{run_id}` when a run times out. */
export interface ChatbotRunTimeoutDetailDTO {
  code: 'run_timed_out';
  message: string | null;
  run_id: string;
  thread_id: string;
}

export interface ChatbotRunTimeoutResponseDTO {
  detail: ChatbotRunTimeoutDetailDTO;
}

/** AG-UI tool-call triad events on the poll channel (camelCase wire per BE ADR-0007). */
export const ChatbotHostEventType = {
  TOOL_CALL_ARGS: 'TOOL_CALL_ARGS',
  TOOL_CALL_END: 'TOOL_CALL_END',
  TOOL_CALL_START: 'TOOL_CALL_START',
} as const;

export type ChatbotHostEventType = (typeof ChatbotHostEventType)[keyof typeof ChatbotHostEventType];

export interface ChatbotToolCallStartHostEvent {
  toolCallId: string;
  toolCallName: string;
  type: typeof ChatbotHostEventType.TOOL_CALL_START;
}

export interface ChatbotToolCallArgsHostEvent {
  delta: string;
  toolCallId: string;
  type: typeof ChatbotHostEventType.TOOL_CALL_ARGS;
}

export interface ChatbotToolCallEndHostEvent {
  toolCallId: string;
  type: typeof ChatbotHostEventType.TOOL_CALL_END;
}

export type ChatbotHostEvent = ChatbotToolCallStartHostEvent | ChatbotToolCallArgsHostEvent | ChatbotToolCallEndHostEvent;

export interface ChatbotClientToolCall {
  args: Record<string, unknown>;
  toolCallId: string;
  toolCallName: string;
  argsParseError?: string;
}

export const ChatbotClientToolError = {
  INVALID_TOOL_ARGS: 'invalid_tool_args',
  /** Aligns with `FzAssistantActErrorCode` — scoped describe_view target did not resolve. */
  NO_MATCH: 'no_match',
  TOOL_EXECUTION_FAILED: 'tool_execution_failed',
  UNKNOWN_TOOL: 'unknown_tool',
} as const;

export type ChatbotClientToolError = (typeof ChatbotClientToolError)[keyof typeof ChatbotClientToolError];

export interface ChatbotInitResponseDTO {
  run_id: string;
  thread_id: string;
}

export interface ChatbotInitResponse {
  runId: string;
  threadId: string;
}

export interface ChatbotRunOutputDTO {
  messages: ChatbotMessageDTO[] | null;
  run_id: string;
  status: ChatbotRunWireStatus;
  thread_id: string;
  hostEvents?: ChatbotHostEvent[];
}

export interface ChatbotRunOutput {
  messages: ChatbotMessage[] | null;
  runId: string;
  status: ChatbotRunStatus;
  threadId: string | null;
  /**
   * Polls performed for the emitting run only. Resets when polling switches to a client-tool
   * continuation so the count does not blend the prior run. Unused by UI today
   * (`buildTimeoutMessage` does not read it); kept for diagnostics / future telemetry.
   */
  pollAttempts?: number;
  hostEvents?: ChatbotHostEvent[];
}

/** The part of an `ExecutionResult` that `manifest` does not already carry (study §3.5). */
export interface FzAssistantActResultEnvelope {
  status: FzAssistantExecutionStatus;
  steps: StepResult[];
  halted_at?: number;
}

export interface ChatbotActionResult {
  success: boolean;
  toolCallId: string;
  error?: string;
  hint?: string;
  manifest?: FzAssistantViewContext;
  /**
   * `act` only — the rest of its `ExecutionResult` (§3.5). `manifest` above carries the `view_context`
   * half for both client tools, so the object reassembles as `{ ...act, view_context: manifest }`.
   *
   * Frontend-proposed and **new**: the action-results body had no slot for a step list, and the backend
   * study models the tool result as a bare `ExecutionResult` with no envelope at all (§12 / §13), so
   * there was nothing to match. Backend is free to **ignore this field** until it has a use for it —
   * nothing on the frontend depends on it being read. If it is still unread when the epic closes,
   * delete it rather than freezing it into the contract.
   *
   * Nested rather than flattened for two reasons: a `status` beside this envelope's own `success` reads
   * as a contradiction on a halted run (`success: true`, `status: 'halted'`), and `steps` is meaningless
   * on every other client tool that shares this shape.
   */
  act?: FzAssistantActResultEnvelope;
}

export type ChatbotActionResultDTO = ChatbotActionResult;

export interface ChatbotActionResultsRequest {
  threadId: string;
  results: ChatbotActionResult[];
  runId?: string;
}

/** BE action-results body: `thread_id` snake_case; result fields camelCase. */
export interface ChatbotActionResultsRequestDTO {
  results: ChatbotActionResultDTO[];
  thread_id: string;
  runId?: string;
}

/** Continuation run started after action-results (same wire shape as init). */
export type ChatbotActionResultsResponseDTO = ChatbotInitResponseDTO;

export type ChatbotActionResultsResponse = ChatbotInitResponse;

export interface ChatbotSubmitFeedbackPayload {
  positive: boolean;
  run_id: string;
  message?: string;
  type?: string;
  user_email?: string;
}

export interface ChatbotConversationItem {
  messages: ChatbotMessage[];
  type: ChatbotMessageType;
  runId?: string;
}

export interface ChatbotChartConfigDTO {
  data: Record<string, unknown>;
  type: string;
}

export interface ChatbotChartConfig {
  data: Record<string, unknown>;
  type: string;
}

export interface ChatbotDatasetPreview {
  columns: string[];
  data: Record<string, unknown>[];
  row_count: number;
}

export interface ChatbotProactiveCommsCheckDTO {
  unseen_count: number;
  /** When set by the API, avoids an extra threads list request to resolve the entry-point thread. */
  latest_unseen_thread_id?: string | null;
}
