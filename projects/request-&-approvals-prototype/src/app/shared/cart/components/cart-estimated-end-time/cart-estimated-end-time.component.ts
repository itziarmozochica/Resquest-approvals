import { ChangeDetectionStrategy, Component, computed, inject, input, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import {
  DurationRange,
  PlanActivityDurations,
} from '@fz-original/app/shared/models/estimated-activity-durations/plan-activity-durations.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { TranslateModule } from '@ngx-translate/core';
import moment, { Moment } from 'moment-timezone';
import { combineLatest, Observable, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

import { DistributorTargetService } from '../../../services/distributor/distributor-target.service';
import { EstimatedActivityDurationsService } from '../../../services/estimated-activity-durations/estimated-activity-durations.service';

const MAXIMUM_PLAUSIBLE_DURATION_IN_MINUTES = 12 * 60;

export interface EstimatedEndTime {
  params: Record<string, string>;
  translationKey: string;
}

type PlanDurationsById = ReadonlyMap<number, PlanActivityDurations | null>;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-cart-estimated-end-time',
  standalone: true,
  styleUrls: ['./cart-estimated-end-time.component.scss'],
  templateUrl: './cart-estimated-end-time.component.html',
})
export class CartEstimatedEndTimeComponent {
  readonly cartSession = input<CartSession | null>(null);
  readonly slotCartSessions = input<readonly CartSession[]>([]);
  readonly slotStartAt = input<string | null>(null);
  readonly timezone = input<string | undefined>(undefined);

  readonly #distributorTarget = inject(DistributorTargetService);
  readonly #durationsService = inject(EstimatedActivityDurationsService);
  readonly #partnerService = inject(PartnerService);

  #mainPlanIdsKey = computed<string>(() =>
    [
      ...new Set(
        this.slotCartSessions()
          .filter((cartSession: CartSession) => cartSession.mainPlanId !== undefined && cartSession.units > 0)
          .map((cartSession: CartSession) => cartSession.mainPlanId as number),
      ),
    ]
      .sort((left: number, right: number) => left - right)
      .join(','),
  );

  #planDurations: Signal<PlanDurationsById> = toSignal(
    toObservable(this.#mainPlanIdsKey).pipe(switchMap((mainPlanIdsKey: string) => this.#fetchPlanDurations(mainPlanIdsKey))),
    { initialValue: new Map<number, PlanActivityDurations | null>() },
  );

  protected readonly estimatedEndTime = computed<EstimatedEndTime | null>(() => {
    const anchor = this.cartSession();
    const slotStart = this.#slotStart();
    if (anchor === null || slotStart === null || anchor.mainPlanId === undefined) {
      return null;
    }

    const durations = this.#planDurations().get(anchor.mainPlanId);
    if (durations === undefined || durations === null) {
      return null;
    }

    const groupId = durations.groupIdOf(anchor);
    if (groupId === null) {
      return null;
    }

    const groupSessions = this.#sessionsOfSamePlan(anchor.mainPlanId);
    if (!this.#isLastOfGroup(anchor, groupSessions, durations, groupId)) {
      return null;
    }

    const range = durations.durationRangeForGroup(groupSessions, groupId);
    return range === null ? null : this.#toEstimatedEndTime(slotStart, range);
  });

  #fetchPlanDurations(mainPlanIdsKey: string): Observable<PlanDurationsById> {
    const partnerId = this.#partnerService.getPartner()?.id;
    const mainPlanIds = mainPlanIdsKey === '' ? [] : mainPlanIdsKey.split(',').map(Number);
    if (partnerId === undefined || mainPlanIds.length === 0 || this.#distributorTarget.isDistributorSession()) {
      return of(new Map<number, PlanActivityDurations | null>());
    }

    return combineLatest(
      mainPlanIds.map((mainPlanId: number) => this.#durationsService.getForPlan(partnerId, mainPlanId).pipe(startWith(null))),
    ).pipe(
      map(
        (durations: (PlanActivityDurations | null)[]) =>
          new Map<number, PlanActivityDurations | null>(
            mainPlanIds.map((mainPlanId: number, index: number) => [mainPlanId, durations[index]]),
          ),
      ),
    );
  }

  #isLastOfGroup(anchor: CartSession, groupSessions: readonly CartSession[], durations: PlanActivityDurations, groupId: number): boolean {
    const membersOfGroup = groupSessions.filter(
      (cartSession: CartSession) => cartSession.units > 0 && durations.groupIdOf(cartSession) === groupId,
    );
    return membersOfGroup[membersOfGroup.length - 1] === anchor;
  }

  #sessionsOfSamePlan(mainPlanId: number): CartSession[] {
    return this.slotCartSessions().filter((cartSession: CartSession) => cartSession.mainPlanId === mainPlanId);
  }

  #slotStart(): Moment | null {
    const slotStartAt = this.slotStartAt();
    if (slotStartAt === null || slotStartAt === '') {
      return null;
    }
    const slotStart = moment.tz(slotStartAt, this.timezone() ?? moment.tz.guess());
    return slotStart.isValid() ? slotStart : null;
  }

  #toEstimatedEndTime(slotStart: Moment, range: DurationRange): EstimatedEndTime | null {
    if (range.maxMinutes > MAXIMUM_PLAUSIBLE_DURATION_IN_MINUTES) {
      return null;
    }
    const earliest = slotStart.clone().add(range.minMinutes, 'minutes').format('HH:mm');
    const latest = slotStart.clone().add(range.maxMinutes, 'minutes').format('HH:mm');
    return earliest === latest
      ? { params: { time: earliest }, translationKey: 'cart.estimatedEndTime.single' }
      : { params: { from: earliest, to: latest }, translationKey: 'cart.estimatedEndTime.range' };
  }
}
