export enum CodeHistoryRecordType {
  CREATED = 'created',
  VALIDATION = 'validation',
  VALIDATION_REVERTED = 'validation_reverted',
}

export enum CodeHistoryOutcome {
  FAILURE = 'failure',
  SUCCESS = 'success',
}

export enum CodeHistoryAttendanceType {
  ENTRY = 'entry',
  EXIT = 'exit',
}

export interface CodeHistoryValidator {
  email: string | null;
  id: string;
}

export interface CodeHistoryProfile {
  id: string;
  name: string | null;
}

export interface CodeHistoryRecordDTO {
  attendance_type: CodeHistoryAttendanceType | null;
  attended_at: string;
  error_type: string | null;
  id: number | null;
  outcome: CodeHistoryOutcome | null;
  profile: CodeHistoryProfile | null;
  type: string;
  validation_channel: string | null;
  validator: CodeHistoryValidator | null;
}

export interface CodeHistoryPageDTO {
  entries: CodeHistoryRecordDTO[];
  next_cursor: string | null;
}

export interface CodeHistoryRecord {
  attendanceType: CodeHistoryAttendanceType | null;
  attendedAt: string;
  errorType: string | null;
  id: number | null;
  outcome: CodeHistoryOutcome | null;
  profile: CodeHistoryProfile | null;
  type: CodeHistoryRecordType;
  validationChannel: string | null;
  validator: CodeHistoryValidator | null;
}

export const CODE_HISTORY_DEFAULT_PAGE_SIZE = 20;

export interface CodeHistoryFirstPageQuery {
  code: string;
  pageSize?: number;
}

export interface CodeHistoryNextPageQuery {
  cursor: string;
}

export type CodeHistoryQuery = CodeHistoryFirstPageQuery | CodeHistoryNextPageQuery;
