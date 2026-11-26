import { ActivityRow } from './activity-row.model';

export interface ActivitySegment {
  readonly isParallel: boolean;
  readonly key: string;
  readonly position: number;
  readonly rows: readonly ActivityRow[];
  readonly startTime: string;
}
