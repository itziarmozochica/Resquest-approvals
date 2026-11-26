export interface UpdateOutflowRequest {
  max_outflow: number;
}

export interface UpdateOutflowResponseData {
  max_outflow: number;
}

export interface UpdateOutflowResult {
  maxOutflow: number;
}

export type OutflowErrorCode =
  | 'INVALID_OUTFLOW_VALUE'
  | 'PLAN_OUTFLOW_LIMIT_EXCEEDED'
  | 'GLOBAL_OUTFLOW_LIMIT_EXCEEDED'
  | 'WAITING_ROOM_NOT_FOUND'
  | 'QUEUE_SERVICE_UNAVAILABLE'
  | 'QUEUEIT_API_ERROR';

export interface OutflowErrorResponse {
  code: OutflowErrorCode;
  message: string;
  max_allowed?: number;
}

export interface WaitingRoomIdResponse {
  waiting_room_id: string | null;
}

export interface WaitingRoomId {
  waitingRoomId: string | null;
}

export interface WaitingRoomDetailsResponse {
  channel_id: string;
  language: string;
  launching_datetime: string;
  max_outflow: number;
  minutes_in_pre_queue: number;
  plan_max_outflow: number;
  plan_type: string;
  timezone: string;
  visibility_mode: string;
  waiting_room_name: string;
}

export interface WaitingRoomDetails {
  channelId: string;
  language: string;
  launchingDatetime: string;
  maxOutflow: number;
  minutesInPreQueue: number;
  planMaxOutflow: number;
  planType: string;
  timezone: string;
  visibilityMode: string;
  waitingRoomName: string;
}

export interface CreateWaitingRoomBody {
  language: string;
  launching_datetime: string;
  main_plan_id: number;
  minutes_in_pre_queue: number;
  timezone: string;
  visibility_mode: string;
  waiting_room_name: string;
  channel_id: string;
}

type EmptyWaitingRoomResponse = object;

export type CreateWaitingRoomResponse = EmptyWaitingRoomResponse;

export type DeleteWaitingRoomResponse = EmptyWaitingRoomResponse;

export interface CreateWaitingRoomInput {
  language: string;
  launchingDatetime: string;
  mainPlanId: number;
  minutesInPreQueue: number;
  timezone: string;
  visibilityMode: string;
  waitingRoomName: string;
  channelId: string;
}
