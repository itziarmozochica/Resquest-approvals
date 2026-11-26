export interface SessionPackDTO {
  id: number;
  is_pack: boolean;
  label: string;
  packed_sessions: PackedSessionDTO[];
  starts_at: string;
  units: number;
}

export interface SessionPack {
  id: number;
  isPack: boolean;
  label: string;
  packedSessions: PackedSession[];
  startsAt: string;
  units: number;
}

export interface PackedSessionDTO extends Omit<SessionPackDTO, 'packed_sessions' | 'is_pack'> {
  session_type_id?: number;
}

export interface PackedSession extends Omit<SessionPack, 'packedSessions' | 'isPack'> {
  sessionTypeId?: number;
}
