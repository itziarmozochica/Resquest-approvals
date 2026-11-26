import { Schedule } from '../schedule.model';
import { CapacityGroup } from './capacity-group.model';
import { CapacityPool } from './capacity-pool.model';
import { CapacitySummaryBySession } from './capacity-summary-by-session.model';

export interface SessionWithCodePool {
  pool: CapacityGroup;
  sessions: CapacitySummaryBySession[];
}

export interface SessionsByCodePool {
  sessionsWithCodePool: SessionWithCodePool[];
  sessionsWithoutCodePool: CapacitySummaryBySession[];
  schedule?: Schedule;
  mustUseTaxBase?: boolean;
  timeSlotCapacity?: CapacityPool;
}
