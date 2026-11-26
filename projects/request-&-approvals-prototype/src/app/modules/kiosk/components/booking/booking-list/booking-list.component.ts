import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { mergeMap } from 'rxjs';

import { PipesModule } from '../../../../../shared/pipes/pipes.module';
import { BookingOrderService } from '../../../services/booking/booking-order.service';
import { BookingOrderGroup, BookingOrderSummary } from '../../../services/booking/booking-orders.model';
import { BookingOrdersService } from '../../../services/booking/booking-orders.service';
import { BookingSessionService } from '../../../services/booking/booking-session.service';
import { BookingTicketPrintService } from '../../../services/booking/booking-ticket-print.service';
import { activeTickets, groupTicketTypes, isOrderCancelled, TicketTypeGroup } from '../../../services/booking/ticket-types.util';
import { IdleService } from '../../../services/idle/idle.service';
import { KioskButtonComponent } from '../../../shared/components/button/kiosk-button.component';
import { KioskHeroComponent } from '../../../shared/components/kiosk-hero/kiosk-hero.component';
import { KioskImageDirective } from '../../../shared/directives/kiosk-image/kiosk-image.directive';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type BookingScheduleStatus = 'scheduled' | 'needs_scheduling' | 'expired' | 'cancelled' | 'none';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, KioskButtonComponent, KioskHeroComponent, KioskImageDirective, PipesModule, TranslateModule],
  selector: 'app-booking-list',
  standalone: true,
  styleUrls: ['./booking-list.component.scss'],
  templateUrl: './booking-list.component.html',
})
export class BookingListComponent implements OnInit {
  readonly #ordersService = inject(BookingOrdersService);
  readonly #orderService = inject(BookingOrderService);
  readonly #printService = inject(BookingTicketPrintService);
  readonly #sessionService = inject(BookingSessionService);
  readonly #idleService = inject(IdleService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  readonly groups: WritableSignal<BookingOrderGroup[]> = signal([]);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly printingOrderId: WritableSignal<number | null> = signal(null);
  readonly printError = signal(false);

  bundleTitle(group: BookingOrderGroup): string {
    return group.orders.map(order => order.plan_name).join(' + ');
  }

  canPrint(orderStatus: BookingScheduleStatus): boolean {
    return orderStatus === 'scheduled' || orderStatus === 'none';
  }

  daysToRedeem(order: BookingOrderSummary): number | null {
    const deadline = order.entitlements_info?.max_reschedule_date;
    if (!deadline) {
      return null;
    }
    return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / MS_PER_DAY));
  }

  done(): void {
    this.#sessionService.endSession();
  }

  hasReschedulesLeft(order: BookingOrderSummary): boolean {
    const info = order.entitlements_info;
    if (!info) {
      return false;
    }
    if (info.max_reschedules == null) {
      return true;
    }
    return info.max_reschedules - info.used_reschedules > 0;
  }

  isCancelled(order: BookingOrderSummary): boolean {
    return isOrderCancelled(order.tickets);
  }

  isGroupFullyCancelled(group: BookingOrderGroup): boolean {
    return group.orders.length > 0 && group.orders.every(order => this.isCancelled(order));
  }

  ngOnInit(): void {
    this.#idleService
      .get(60)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#sessionService.endSession());
    this.#load();
  }

  orderCount(group: BookingOrderGroup): number {
    return group.orders.length;
  }

  orderLocator(group: BookingOrderGroup): string | null {
    const mainOrderId = group.main_group_order?.id;
    const mainOrder = mainOrderId == null ? undefined : group.orders.find(order => order.id === mainOrderId);
    return (mainOrder ?? group.orders[0])?.external_id ?? null;
  }

  reschedule(orderId: number): void {
    void this.#router.navigate(['/kiosk/booking', orderId, 'reschedule']);
  }

  scheduledAt(order: BookingOrderSummary): string | null {
    if (order.is_timeless) {
      return null;
    }
    return activeTickets(order.tickets).find(ticket => !ticket.session_is_timeless && ticket.starts_at)?.starts_at ?? null;
  }

  showScheduleDetails(order: BookingOrderSummary, orderStatus: BookingScheduleStatus): boolean {
    return !order.is_timeless && orderStatus === 'scheduled';
  }

  venueTimezone(order: BookingOrderSummary): string {
    return activeTickets(order.tickets).find(ticket => ticket.timezone)?.timezone ?? '';
  }

  showTickets(orderId: number): void {
    this.printingOrderId.set(orderId);
    this.printError.set(false);
    this.#orderService
      .getOrderDetail(orderId)
      .pipe(
        mergeMap(detail => this.#printService.print(detail)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => {
          this.printingOrderId.set(null);
          this.printError.set(true);
        },
        next: () => this.printingOrderId.set(null),
      });
  }

  status(order: BookingOrderSummary): BookingScheduleStatus {
    if (this.isCancelled(order)) {
      return 'cancelled';
    }

    const now = Date.now();
    const info = order.entitlements_info;
    const deadlineExpired = !!info?.max_reschedule_date && Date.parse(info.max_reschedule_date) < now;

    if (info?.status === 'pending_to_schedule') {
      return deadlineExpired ? 'expired' : 'needs_scheduling';
    }

    const scheduledAt = this.scheduledAt(order);
    if (scheduledAt) {
      return Date.parse(scheduledAt) < now ? 'expired' : 'scheduled';
    }

    if (!info) {
      return 'none';
    }

    return deadlineExpired ? 'expired' : 'needs_scheduling';
  }

  ticketTypes(order: BookingOrderSummary): TicketTypeGroup[] {
    return groupTicketTypes(activeTickets(order.tickets));
  }

  ticketTypesLabel(order: BookingOrderSummary): string {
    return this.ticketTypes(order)
      .map(type => `${type.count}x ${type.label}`)
      .join(', ');
  }

  #load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.#ordersService
      .getOrderGroups()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
        next: groups => {
          this.groups.set(groups);
          this.isLoading.set(false);
        },
      });
  }
}
