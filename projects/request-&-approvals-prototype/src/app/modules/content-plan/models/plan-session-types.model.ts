export interface SessionTypeChannelDTO {
  channel_id: string;
}

export interface UngroupedSessionTypeDTO {
  id: number;
  label: string;
  details?: string;
  instructions?: string;
  channels?: SessionTypeChannelDTO[];
  published?: boolean;
}

export interface SessionTypeGroupDTO {
  id: number;
  name: string;
  session_types?: UngroupedSessionTypeDTO[];
}

export interface PlanSessionTypesResponseDTO {
  data?: {
    ungrouped_session_types?: UngroupedSessionTypeDTO[];
    session_type_groups?: SessionTypeGroupDTO[];
  } | null;
  error?: unknown;
}

export interface PlanSessionType {
  id: number;
  label: string;
  details: string;
  instructions: string;
  channels: string[];
  published: boolean;
}
