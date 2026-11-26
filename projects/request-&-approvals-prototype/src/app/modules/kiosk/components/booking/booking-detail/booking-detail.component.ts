import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '../../../../../shared/pipes/pipes.module';
import { BookingOrderDetail } from '../../../services/booking/booking-order.model';
import { BookingOrderService } from '../../../services/booking/booking-order.service';
import { BookingSessionService } from '../../../services/booking/booking-session.service';
import { BookingTicketPrintService } from '../../../services/booking/booking-ticket-print.service';
import { groupTicketTypes, TicketTypeGroup } from '../../../services/booking/ticket-types.util';
import { IdleService } from '../../../services/idle/idle.service';
import { KioskButtonComponent } from '../../../shared/components/button/kiosk-button.component';

/**
 * Shows one booking's detail — event info, tickets and their QR/barcodes —
 * fetched with the otoken from `GET /api/4.2/orders/{orderId}/`, and prints the
 * tickets on the kiosk's thermal printer (reusing the purchase-flow printer
 * path: generate instructions for the order → send via the webview bridge).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KioskButtonComponent, PipesModule, TranslateModule],
  selector: 'app-booking-detail',
  standalone: true,
  styleUrls: ['./booking-detail.component.scss'],
  templateUrl: './booking-detail.component.html',
})
export class BookingDetailComponent implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #bookingOrderService = inject(BookingOrderService);
  readonly #sessionService = inject(BookingSessionService);
  readonly #idleService = inject(IdleService);
  readonly #printService = inject(BookingTicketPrintService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  readonly orderId = this.#route.snapshot.paramMap.get('orderId');
  readonly order: WritableSignal<BookingOrderDetail | null> = signal(null);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly isPrinting = signal(false);
  readonly printError = signal(false);

  readonly ticketTypes = computed<TicketTypeGroup[]>(() => groupTicketTypes(this.order()?.tickets ?? []));
  readonly scheduledAt = computed(() => {
    const ticket = this.order()?.tickets.find(t => !t.session_is_timeless && t.starts_at);
    return ticket?.starts_at ?? null;
  });
  readonly venueTimezone = computed(() => this.order()?.tickets.find(t => t.timezone)?.timezone ?? '');

  goBack(): void {
    void this.#router.navigate(['/kiosk/booking']);
  }

  ngOnInit(): void {
    this.#idleService
      .get(60)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#sessionService.endSession());
    const id = Number(this.orderId);
    if (!id) {
      this.#fail();
      return;
    }

    this.#bookingOrderService
      .getOrderDetail(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => this.#fail(),
        next: order => {
          this.order.set(order);
          this.isLoading.set(false);
        },
      });
  }

  printTickets(): void {
    const order = this.order();
    if (!order) {
      return;
    }
    this.isPrinting.set(true);
    this.printError.set(false);
    this.#printService
      .print(order)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.isPrinting.set(false);
          this.printError.set(true);
        },
        next: () => this.isPrinting.set(false),
      });
  }

  #fail(): void {
    this.hasError.set(true);
    this.isLoading.set(false);
  }
}
