import { Schedule } from '../schedule.model';
import { CapacityGroup } from './capacity-group.model';
import { CapacityPool } from './capacity-pool.model';
import { CapacitySummaryBySession } from './capacity-summary-by-session.model';

export interface SessionWithGroup {
  pool: CapacityGroup;
  sessions: CapacitySummaryBySession[];
}

export interface GroupedSessions {
  sessionsWithCodePool: SessionWithGroup[];
  sessionsWithoutCodePool: CapacitySummaryBySession[];
  schedule: Schedule | null;
  mustUseTaxBase?: boolean;
  timeSlotCapacity?: CapacityPool;
}
