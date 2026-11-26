import { inject, Injectable } from '@angular/core';

import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { IgntDialogRef, IgntDialogService } from '@ignite/common';
import { Observable, of } from 'rxjs';
import { catchError, defaultIfEmpty, map } from 'rxjs/operators';

import { Reservation } from '../../models/reservation.model';
import { ReservationsService } from '../../services/reservations.service';
import { ProformaInvoiceDialogComponent } from '../containers/proforma-invoice-dialog/proforma-invoice-dialog.component';
import { ProformaInvoiceDialogData, ProformaInvoiceDialogResult } from '../models/proforma-invoice-dialog.model';
import { PROFORMA_INVOICE_FEATURE } from '../utils/proforma-invoice.optimizely-feature';

type ProformaInvoiceReservation = Pick<Reservation, 'businessEmail' | 'businessId' | 'businessName' | 'id'>;

@Injectable({
  providedIn: 'root',
})
export class ProformaInvoiceService {
  readonly #dialogService = inject(IgntDialogService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #reservationsService = inject(ReservationsService);

  isAvailableFor(reservationId: string): boolean {
    return this.isEnabled() && !this.#reservationsService.isScopedToAnotherOrganization(reservationId);
  }

  isEnabled(): boolean {
    return this.#optimizelyService.isFeatureEnabled(PROFORMA_INVOICE_FEATURE) ?? false;
  }

  open(data: ProformaInvoiceDialogData): IgntDialogRef<ProformaInvoiceDialogResult> {
    return this.#dialogService.openSidePanel<ProformaInvoiceDialogResult, ProformaInvoiceDialogData>(ProformaInvoiceDialogComponent, {
      data,
    });
  }

  openForReservation(reservation: ProformaInvoiceReservation, language: string): IgntDialogRef<ProformaInvoiceDialogResult> {
    return this.open({
      businessEmail: reservation.businessEmail ?? null,
      businessId: reservation.businessId ?? null,
      businessName: reservation.businessName ?? null,
      language,
      reservationId: reservation.id,
    });
  }

  openForReservationId(reservationId: string, language: string): Observable<IgntDialogRef<ProformaInvoiceDialogResult>> {
    return this.#readReservation(reservationId).pipe(
      map(reservation =>
        this.openForReservation(reservation ?? { businessEmail: null, businessId: null, businessName: null, id: reservationId }, language),
      ),
    );
  }

  #readReservation(reservationId: string): Observable<ProformaInvoiceReservation | null> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      return of(null);
    }

    return this.#reservationsService.getReservation({ partnerId, reservationId }).pipe(
      map(response => {
        const reservation = response.data?.reservationData;
        return reservation ? { ...reservation, id: reservationId } : null;
      }),
      catchError(() => of(null)),
      defaultIfEmpty(null),
    );
  }
}
