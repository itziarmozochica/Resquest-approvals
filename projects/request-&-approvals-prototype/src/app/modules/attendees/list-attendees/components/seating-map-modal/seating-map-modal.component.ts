import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { SeatInfoApiErrorEvent } from '@fz-original/app/core/tracking/core/events/seat-info-api-error';
import { SeatInfoApiSuccessEvent } from '@fz-original/app/core/tracking/core/events/seat-info-api-success';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import { SeatInfoResult } from '@fz-original/app/shared/models/seat-info/seat-info-response.model';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { SeatInfoService } from '@fz-original/app/shared/services/seat-info/seat-info.service';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import Seatsio from '@seatsio/seatsio-types';

@Component({
  selector: 'app-seating-map-modal',
  standalone: false,
  templateUrl: './seating-map-modal.component.html',
})
export class SeatingMapModalComponent implements OnInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #paymentConfigStorageService = inject(PaymentConfigStorageService);
  readonly #router = inject(Router);
  readonly #seatInfoService = inject(SeatInfoService);
  readonly #toastService = inject(ToastService);
  readonly #trackingService = inject(TrackingService);

  readonly #isDualScreen: boolean = this.#dualScreenStorageService.containsData();
  readonly #isMobilePos: boolean = this.#paymentConfigStorageService.isMobilePos();

  @Input() availableChannels: string[] = [];
  @Input() mainPlanId: number | null = null;
  @Input() partnerId: number | null = null;
  @Input() seatingEvent = '';
  @Input() seatingPoolId: number | null = null;
  @Input() workspacePublicKey = '';

  ngOnInit(): void {
    const seatsIO: Seatsio.Seatsio = window.seatsio;
    if (!seatsIO) {
      return;
    }
    const seatingChart = new seatsIO.SeatingChart({
      channels: this.availableChannels,
      divId: 'attendee-seating-map',
      event: this.seatingEvent,
      legend: {
        hideUnavailableLegendItem: true,
      },
      mode: 'static',
      objectTooltip: {
        showUnavailableNotice: false,
      },
      showLegend: true,
      workspaceKey: this.workspacePublicKey,
      objectColor: function (object: Seatsio.SelectableObject, defaultColor: string) {
        if ((object as Seatsio.AbstractBookableObject).status === 'booked') {
          return defaultColor as string;
        }
        if ((object as Seatsio.AbstractBookableObject).status === 'reservedByToken') {
          return object.category?.color as string;
        }
        return defaultColor as string;
      },
      objectIcon: function (object, defaultIcon) {
        if ((object as Seatsio.AbstractBookableObject).status === 'booked') {
          return 'check';
        }
        return defaultIcon as string;
      },
      onObjectClicked: (object: Seatsio.SelectableObject) => this.#onSeatClicked(object),
    });

    seatingChart.render();
  }

  #cleanupModalOverlay(): void {
    const modalElements = document.querySelectorAll('ngb-modal-window, .modal-backdrop');
    modalElements.forEach(element => element.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('overflow');
  }

  #getTicketIdFromObject(object: Seatsio.SelectableObject): number | null {
    const bookable = object as Seatsio.AbstractBookableObject;
    if (bookable.status !== 'booked') {
      return null;
    }

    const extra = bookable.extraData as Record<string, unknown> | undefined;
    if (extra) {
      const ticketId = this.#parseIdField(extra);
      if (ticketId !== null) {
        return ticketId;
      }
    }

    const dataPerEvent = bookable.dataPerEvent as Record<string, Record<string, unknown>> | undefined;
    if (dataPerEvent?.[this.seatingEvent]) {
      return this.#parseIdField(dataPerEvent[this.seatingEvent]);
    }

    return null;
  }

  #navigateToValidation(type: 'order' | 'ticket' | 'reservation', id: number | string): void {
    const urlTree = this.#router.createUrlTree(['/validation'], {
      queryParams: { id, type },
    });

    if (this.#isDualScreen || this.#isMobilePos) {
      this.#cleanupModalOverlay();
      this.#router.navigateByUrl(urlTree);
    } else {
      const url = `${window.location.origin}${this.#router.serializeUrl(urlTree)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  #onSeatClicked(object: Seatsio.SelectableObject): void {
    const ticketId = this.#getTicketIdFromObject(object);
    if (ticketId !== null) {
      this.#openValidationPage(ticketId);
      return;
    }

    const bookable = object as Seatsio.AbstractBookableObject;
    if (bookable.status !== 'booked') {
      return;
    }

    const seatReference = (object as { label?: string }).label;
    if (!seatReference || this.partnerId === null || this.mainPlanId === null || this.seatingPoolId === null) {
      return;
    }

    this.#seatInfoService
      .getSeatInfo(this.partnerId, this.mainPlanId, seatReference, this.seatingPoolId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (err: { message?: string }) => {
          const translationKey = err?.message ?? 'errors.generic';
          this.#trackSeatInfoError(seatReference, translationKey);
          this.#toastService.add({ autoHide: true, translationKey, type: ToastType.ERROR });
        },
        next: result => {
          this.#trackSeatInfoSuccess(seatReference, result);
          this.#openValidationPageFromResult(result);
        },
      });
  }

  #openValidationPage(ticketId: number): void {
    this.#navigateToValidation('ticket', ticketId);
  }

  #openValidationPageFromResult(result: SeatInfoResult): void {
    if (result.orderId != null) {
      this.#navigateToValidation('order', result.orderId);
      return;
    }
    if (result.reservationLocator != null) {
      this.#navigateToValidation('reservation', result.reservationLocator);
    }
  }

  #parseIdField(record: Record<string, unknown>): number | null {
    const id = record['ticketId'] ?? record['ticket_id'];
    if (typeof id === 'number' && Number.isInteger(id) && id > 0) {
      return id;
    }
    if (typeof id === 'string') {
      const trimmed = id.trim();
      if (trimmed.length === 0) return null;
      const parsed = Number(trimmed);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }
    return null;
  }

  #trackSeatInfoError(seatReference: string, errorMessage: string): void {
    this.#trackingService.track(
      new SeatInfoApiErrorEvent({
        errorMessage,
        mainPlanId: this.mainPlanId!,
        partnerId: this.partnerId!,
        seatingPoolId: this.seatingPoolId!,
        seatReference,
      }),
    );
  }

  #trackSeatInfoSuccess(seatReference: string, result: SeatInfoResult): void {
    const validationType = result.orderId != null ? 'order' : 'reservation';
    this.#trackingService.track(
      new SeatInfoApiSuccessEvent({
        mainPlanId: this.mainPlanId!,
        orderId: result.orderId,
        partnerId: this.partnerId!,
        reservationLocator: result.reservationLocator,
        seatingPoolId: this.seatingPoolId!,
        seatReference,
        validationType,
      }),
    );
  }
}
