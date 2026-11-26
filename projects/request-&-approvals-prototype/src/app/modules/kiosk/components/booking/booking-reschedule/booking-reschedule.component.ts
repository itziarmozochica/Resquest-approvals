import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { IgntButtonComponent, IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, Observable, Subject, switchMap, tap } from 'rxjs';

import { PipesModule } from '../../../../../shared/pipes/pipes.module';
import { Channel } from '../../../../../shared/services/session-availability/channel.enum';
import { RescheduleSession, RescheduleTimeSlot } from '../../../services/booking/booking-availability.model';
import { BookingAvailabilityService } from '../../../services/booking/booking-availability.service';
import { BookingOrderDetail } from '../../../services/booking/booking-order.model';
import { BookingOrderService } from '../../../services/booking/booking-order.service';
import { EntitlementReschedulePair } from '../../../services/booking/booking-reschedule.model';
import { BookingRescheduleService } from '../../../services/booking/booking-reschedule.service';
import { BookingSessionService } from '../../../services/booking/booking-session.service';
import { BookingTicketPrintService } from '../../../services/booking/booking-ticket-print.service';
import { activeTickets, isOrderCancelled } from '../../../services/booking/ticket-types.util';
import { IdleService } from '../../../services/idle/idle.service';
import { KioskButtonComponent } from '../../../shared/components/button/kiosk-button.component';
import { IconButtonComponent } from '../../../shared/components/icon-button/icon-button.component';
import { KioskHeroComponent } from '../../../shared/components/kiosk-hero/kiosk-hero.component';
import { KioskDatePickerModalComponent } from '../../../shared/components/modals/kiosk-date-picker/kiosk-date-picker-modal.component';
import { KioskDatePickerModalData } from '../../../shared/components/modals/kiosk-date-picker/kiosk-date-picker-modal.model';

const SESSION_CLASH_STATUS = 409;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'other';

export interface RescheduleTimeSlotGroup {
  period: TimeOfDay;
  slots: RescheduleTimeSlot[];
}

const TIME_OF_DAY_ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'other'];

/**
 * Entitlement (free) reschedule. Loads the order (tickets + entitlement
 * window), shows the remaining change window, lists the bookable dates and the
 * sessions for the chosen date (public availability endpoints — no otoken),
 * grouped by time of day, then submits the ticket→session pairs via the otoken
 * reschedule endpoint. On success a confirmation overlay offers to print or
 * return to the booking list; on a 409 clash it warns and lets the customer
 * confirm anyway (warn-then-allow, mirroring DESEO-955).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IconButtonComponent,
    IgntButtonComponent,
    IgntIconComponent,
    KioskButtonComponent,
    KioskHeroComponent,
    PipesModule,
    TranslateModule,
  ],
  selector: 'app-booking-reschedule',
  standalone: true,
  styleUrls: ['./booking-reschedule.component.scss'],
  templateUrl: './booking-reschedule.component.html',
})
export class BookingRescheduleComponent implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #orderService = inject(BookingOrderService);
  readonly #availabilityService = inject(BookingAvailabilityService);
  readonly #rescheduleService = inject(BookingRescheduleService);
  readonly #printService = inject(BookingTicketPrintService);
  readonly #sessionService = inject(BookingSessionService);
  readonly #idleService = inject(IdleService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(IgntDialogService);
  readonly #translate = inject(TranslateService);

  readonly orderId = Number(this.#route.snapshot.paramMap.get('orderId'));
  readonly order: WritableSignal<BookingOrderDetail | null> = signal(null);
  readonly placeId: WritableSignal<number | null> = signal(null);
  readonly availableDates: WritableSignal<string[]> = signal([]);
  readonly selectedDate: WritableSignal<string | null> = signal(null);
  readonly sessions: WritableSignal<RescheduleSession[]> = signal([]);
  readonly selectedTime: WritableSignal<string | null> = signal(null);
  readonly isSubmitting = signal(false);
  readonly isLoadingSessions = signal(false);
  readonly hasError = signal(false);
  readonly clashDetected = signal(false);
  readonly rescheduled = signal(false);
  readonly printError = signal(false);
  readonly printing = signal(false);

  readonly #dateSelected$ = new Subject<{ date: string; placeId: number; planId: number; sessionTypeIds: number[] }>();

  readonly planName = computed(() => this.order()?.catalog_main_plan_name || this.order()?.plan_name || '');
  readonly venueTimezone = computed(() => activeTickets(this.order()?.tickets ?? []).find(t => t.timezone)?.timezone ?? '');

  readonly location = computed(
    () => activeTickets(this.order()?.tickets ?? []).find(ticket => ticket.session_place_name)?.session_place_name ?? '',
  );

  readonly currentBooking = computed(() => {
    const ticket = activeTickets(this.order()?.tickets ?? []).find(t => !t.session_is_timeless && t.starts_at);
    return ticket?.starts_at ?? null;
  });

  readonly remainingReschedules = computed(() => {
    const info = this.order()?.entitlement_reschedule_info;
    return info ? Math.max(info.max_reschedules - info.used_reschedules, 0) : 0;
  });

  readonly daysLeft = computed(() => {
    const deadline = this.order()?.entitlement_reschedule_info?.max_schedule_date;
    if (!deadline) {
      return null;
    }
    return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / MS_PER_DAY));
  });

  readonly timeSlots = computed<RescheduleTimeSlot[]>(() => {
    const order = this.order();
    if (!order) {
      return [];
    }
    const times = [...new Set(this.sessions().map(session => session.label))];
    return times.map(time => ({ bookable: this.#resolvePairsForTime(order, time) !== null, time }));
  });

  readonly timeSlotGroups = computed<RescheduleTimeSlotGroup[]>(() => {
    const buckets = new Map<TimeOfDay, RescheduleTimeSlot[]>();
    for (const slot of this.timeSlots()) {
      const period = this.#timeOfDay(slot.time);
      const slots = buckets.get(period) ?? [];
      slots.push(slot);
      buckets.set(period, slots);
    }
    return TIME_OF_DAY_ORDER.filter(period => buckets.has(period)).map(period => ({ period, slots: buckets.get(period) ?? [] }));
  });

  #pendingPairs: EntitlementReschedulePair[] = [];

  confirm(): void {
    const detail = this.order();
    const time = this.selectedTime();
    if (!detail || time === null) {
      return;
    }
    const pairs = this.#resolvePairsForTime(detail, time);
    if (!pairs) {
      return;
    }
    this.#pendingPairs = pairs;
    this.#submit(false);
  }

  confirmAnyway(): void {
    if (this.#pendingPairs.length) {
      this.#submit(true);
    }
  }

  goBack(): void {
    void this.#router.navigate(['/kiosk/booking']);
  }

  ngOnInit(): void {
    this.#idleService
      .get(60)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#sessionService.endSession());
    this.#dateSelected$
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        tap(() => this.isLoadingSessions.set(true)),
        switchMap(({ date, placeId, planId, sessionTypeIds }) => this.#getSessionsForDate(planId, placeId, date, sessionTypeIds)),
      )
      .subscribe(sessions => {
        this.isLoadingSessions.set(false);
        this.sessions.set(sessions);
      });
    if (!this.orderId) {
      this.hasError.set(true);
      return;
    }
    this.#orderService
      .getOrderDetail(this.orderId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => this.hasError.set(true),
        next: order => {
          if (this.#isCancelled(order)) {
            this.returnToBooking();
            return;
          }
          this.order.set(order);
          this.#loadPlaceAndDates(order);
        },
      });
  }

  openDatePicker(): void {
    const info = this.order()?.entitlement_reschedule_info;
    if (!info) {
      return;
    }
    const data: KioskDatePickerModalData = {
      applyLabel: this.#translate.instant('kiosk.booking.reschedule.continue'),
      initialDate: this.selectedDate(),
      maxDate: info.max_schedule_date,
      minDate: info.min_schedule_date,
      timezone: this.venueTimezone(),
      title: this.#translate.instant('kiosk.booking.reschedule.dateAndHour'),
    };
    this.#dialog
      .openModal<string | null, KioskDatePickerModalData>(KioskDatePickerModalComponent, { data, size: 'md' })
      .closed$.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(result => {
        if (result) {
          this.selectDate(result);
        }
      });
  }

  printTickets(): void {
    const order = this.order();
    if (!order) {
      return;
    }
    this.printError.set(false);
    this.printing.set(true);
    this.#printService
      .print(order)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.printing.set(false);
          this.printError.set(true);
        },
        next: () => this.returnToBooking(),
      });
  }

  returnToBooking(): void {
    void this.#router.navigate(['/kiosk/booking']);
  }

  selectDate(date: string): void {
    const detail = this.order();
    const placeId = this.placeId();
    if (!detail || placeId === null) {
      return;
    }
    this.selectedDate.set(date);
    this.selectedTime.set(null);
    this.sessions.set([]);
    this.hasError.set(false);
    this.clashDetected.set(false);
    this.#pendingPairs = [];
    this.#dateSelected$.next({
      date,
      placeId,
      planId: this.#reschedulePlanId(detail),
      sessionTypeIds: this.#targetSessionTypeIds(detail),
    });
  }

  selectTime(time: string): void {
    this.selectedTime.set(time);
    this.clashDetected.set(false);
  }

  #loadDates(order: BookingOrderDetail, placeId: number): void {
    const info = order.entitlement_reschedule_info;
    if (!info) {
      return;
    }
    this.#availabilityService
      .getAvailableDates(
        this.#reschedulePlanId(order),
        placeId,
        info.min_schedule_date,
        info.max_schedule_date,
        Channel.EntitlementsReschedule,
      )
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => this.hasError.set(true),
        next: dates => this.availableDates.set(dates),
      });
  }

  #loadPlaceAndDates(order: BookingOrderDetail): void {
    if (!order.entitlement_reschedule_info) {
      this.hasError.set(true);
      return;
    }
    if (typeof order.place_id === 'number') {
      this.placeId.set(order.place_id);
      this.#loadDates(order, order.place_id);
      return;
    }
    this.#availabilityService
      .getPlanPlaceId(this.#reschedulePlanId(order), Channel.EntitlementsReschedule)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => this.hasError.set(true),
        next: placeId => {
          this.placeId.set(placeId);
          if (placeId !== null) {
            this.#loadDates(order, placeId);
          } else {
            this.hasError.set(true);
          }
        },
      });
  }

  #isCancelled(order: BookingOrderDetail): boolean {
    return isOrderCancelled(order.tickets);
  }

  #getSessionsForDate(planId: number, placeId: number, date: string, sessionTypeIds: number[]): Observable<RescheduleSession[]> {
    return this.#availabilityService.getSessionsForDate(planId, placeId, date, Channel.EntitlementsReschedule, sessionTypeIds).pipe(
      catchError(() => {
        this.isLoadingSessions.set(false);
        this.hasError.set(true);
        return EMPTY;
      }),
    );
  }

  #requiredCountByType(order: BookingOrderDetail): Map<string, number> {
    const counts = new Map<string, number>();
    for (const ticket of activeTickets(order.tickets)) {
      if (ticket.target_entitlement_session_type_id === undefined) {
        continue;
      }
      const key = String(ticket.target_entitlement_session_type_id);
      counts.set(key, (counts.get(key) ?? 0) + (ticket.ticket_number ?? 1));
    }
    return counts;
  }

  #reschedulePlanId(order: BookingOrderDetail): number {
    return order.catalog_main_plan_id ?? order.plan_id;
  }

  #resolvePairsForTime(order: BookingOrderDetail, time: string): EntitlementReschedulePair[] | null {
    const leaves = this.sessions().filter(session => session.label === time);
    const required = this.#requiredCountByType(order);
    if (!required.size) {
      return null;
    }
    for (const [itemType, count] of required) {
      const leaf = leaves.find(session => session.itemType === itemType);
      if (!leaf || (leaf.availableTickets !== undefined && leaf.availableTickets < count)) {
        return null;
      }
    }
    const pairs: EntitlementReschedulePair[] = [];
    for (const ticket of activeTickets(order.tickets)) {
      if (ticket.target_entitlement_session_type_id === undefined) {
        continue;
      }
      const leaf = leaves.find(session => session.itemType === String(ticket.target_entitlement_session_type_id));
      if (leaf) {
        pairs.push({ target_session_id: leaf.id, ticket_id: ticket.id });
      }
    }
    return pairs.length ? pairs : null;
  }

  #submit(acknowledgeClash: boolean): void {
    this.isSubmitting.set(true);
    this.hasError.set(false);
    this.clashDetected.set(false);

    this.#rescheduleService
      .reschedule(this.#pendingPairs, acknowledgeClash)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: error => {
          this.isSubmitting.set(false);
          if (!acknowledgeClash && error?.status === SESSION_CLASH_STATUS) {
            this.clashDetected.set(true);
            return;
          }
          this.hasError.set(true);
        },
        next: () => {
          this.isSubmitting.set(false);
          this.rescheduled.set(true);
        },
      });
  }

  #targetSessionTypeIds(order: BookingOrderDetail): number[] {
    const targetSessionTypeIds = activeTickets(order.tickets)
      .map(ticket => ticket.target_entitlement_session_type_id)
      .filter((sessionTypeId): sessionTypeId is number => sessionTypeId !== undefined);
    return [...new Set(targetSessionTypeIds)];
  }

  #timeOfDay(time: string): TimeOfDay {
    const match = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (!match) {
      return 'other';
    }
    let hour = Number(match[1]);
    const meridiem = match[3]?.toLowerCase();
    if (meridiem === 'pm' && hour < 12) {
      hour += 12;
    }
    if (meridiem === 'am' && hour === 12) {
      hour = 0;
    }
    if (hour < 12) {
      return 'morning';
    }
    if (hour < 18) {
      return 'afternoon';
    }
    return 'evening';
  }
}
