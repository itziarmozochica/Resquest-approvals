import { Schedule } from '../schedule.model';
import { CapacityGroup, CodePoolSummaryData } from './capacity-group.model';
import { CapacitySummaryBySession } from './capacity-summary-by-session.model';
import { CapacitySummaryByDate } from './capacity-summary-date.model';
import { CapacitySummaryByDatetime, CapacitySummaryByDatetimeData } from './capacity-summary-datetime.model';
import { GroupedSessions, SessionWithGroup } from './grouped-sessions.model';

export interface CapacitySummaryData {
  timezone: string;
  must_use_tax_base: boolean;
  date_summaries: Record<
    string,
    {
      datetime_summaries: Record<string, CapacitySummaryByDatetimeData>;
    }
  >;
  code_pool_summaries: Map<number, CodePoolSummaryData>;
}

export class CapacitySummary {
  constructor(
    public timezone: string,
    public mustUseTaxBase: boolean,
    public capacitySummaryByDate: CapacitySummaryByDate[],
    public codePoolSummaries: Map<number, CapacityGroup> = new Map(),
  ) {}

  getSessionsGroupedByCodePool(date: string, datetime: string): GroupedSessions {
    const sessionsWithCodePoolMap: Map<number, Array<CapacitySummaryBySession>> = new Map();
    const capacitySummaryByDate: CapacitySummaryByDate | undefined = this.capacitySummaryByDate.find(
      capacitySummary => capacitySummary.date === date,
    );
    const capacitySummaryByDateTime: CapacitySummaryByDatetime | undefined = capacitySummaryByDate?.capacitySummaryByDatetime.find(
      capacitySummary => capacitySummary.datetime === datetime,
    );
    if (capacitySummaryByDateTime === undefined) {
      return { sessionsWithCodePool: [], sessionsWithoutCodePool: [], schedule: null };
    }
    return this.getsSessionsGroupedByCodePool(capacitySummaryByDateTime, sessionsWithCodePoolMap);
  }

  getSessionsGroupedByDates(date?: string, datetime?: string): Map<string, GroupedSessions> {
    const sessionsWithCodePoolMap: Map<number, CapacitySummaryBySession[]> = new Map<number, CapacitySummaryBySession[]>();
    const sessionsGroupedByCodePoolTime = new Map<string, GroupedSessions>();
    let capacitySummaryByDateList: CapacitySummaryByDate[];
    if (date) {
      capacitySummaryByDateList = this.capacitySummaryByDate.filter(capacitySummary => capacitySummary.date === date);
    } else {
      capacitySummaryByDateList = this.capacitySummaryByDate;
    }
    capacitySummaryByDateList.forEach(capacitySummaryByDate => {
      let capacitySummaryByDateTimeList: CapacitySummaryByDatetime[];
      if (datetime) {
        capacitySummaryByDateTimeList = capacitySummaryByDate?.capacitySummaryByDatetime.filter(
          capacitySummary => new Date(capacitySummary.datetime).toISOString() === new Date(datetime).toISOString(),
        );
      } else {
        capacitySummaryByDateTimeList = capacitySummaryByDate?.capacitySummaryByDatetime;
      }
      capacitySummaryByDateTimeList.forEach(capacitySummaryByDateTime =>
        sessionsGroupedByCodePoolTime.set(
          capacitySummaryByDateTime.datetime,
          this.getsSessionsGroupedByCodePool(capacitySummaryByDateTime, sessionsWithCodePoolMap),
        ),
      );
    });
    return sessionsGroupedByCodePoolTime;
  }

  private getsSessionsGroupedByCodePool(
    capacitySummaryByDateTime: CapacitySummaryByDatetime,
    sessionsWithCodePoolMap: Map<number, CapacitySummaryBySession[]>,
  ): GroupedSessions {
    let sessionsWithCodePool: SessionWithGroup[] = [];
    const sessionsWithoutCodePool: CapacitySummaryBySession[] = [];
    let schedule: Schedule | null = null;
    capacitySummaryByDateTime?.capacitySummaryBySessions.forEach(capacitySession => {
      if (!schedule) {
        schedule = new Schedule(capacitySession.startsAt, capacitySession.expiresAt, capacitySession.endsAt, capacitySession.soldTickets);
      } else {
        schedule.updateSchedule(capacitySession.startsAt, capacitySession.expiresAt, capacitySession.endsAt, capacitySession.soldTickets);
      }
      if (!capacitySession.codePoolId) {
        sessionsWithoutCodePool.push(capacitySession);
        return;
      }
      const sessionWithCodePool = sessionsWithCodePoolMap.get(capacitySession.codePoolId);
      return sessionWithCodePool
        ? sessionWithCodePool.push(capacitySession)
        : sessionsWithCodePoolMap.set(capacitySession.codePoolId, [capacitySession]);
    });
    sessionsWithCodePool = Array.from(sessionsWithCodePoolMap, ([key, value]) => {
      const pool: CapacityGroup | undefined = this.codePoolSummaries.get(key);
      if (pool === undefined) {
        return undefined;
      }
      return {
        pool,
        sessions: value,
      };
    }).filter((item): item is SessionWithGroup => !!item);
    CapacitySummary.sortByGroupName(sessionsWithCodePool);

    return { sessionsWithCodePool, sessionsWithoutCodePool, schedule, mustUseTaxBase: this.mustUseTaxBase };
  }

  static sortByGroupName(sessionsWithCodePool: SessionWithGroup[]): void {
    sessionsWithCodePool.sort((a, b) => {
      if (a.pool.group?.name && b.pool.group?.name) {
        if (a.pool.group.name.toLocaleLowerCase() < b.pool.group.name.toLocaleLowerCase()) {
          return -1;
        }
        if (a.pool.group.name.toLocaleLowerCase() > b.pool.group.name.toLocaleLowerCase()) {
          return 1;
        }
      }
      if (a.pool.group?.name) {
        return -1;
      }
      if (b.pool.group?.name) {
        return 1;
      }
      if (a.pool.group) {
        return -1;
      }
      if (b.pool.group) {
        return 1;
      }
      return 0;
    });
  }
}
