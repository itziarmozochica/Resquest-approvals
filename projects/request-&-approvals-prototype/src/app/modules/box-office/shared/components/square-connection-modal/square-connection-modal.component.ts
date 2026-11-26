import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  CreateSquarePairingCode,
  PairingStatus,
  SquareConfiguration,
  SquarePairingCode,
} from '@fz-original/app/app/models/payment-checkout-square.model';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of, throwError } from 'rxjs';
import { finalize, mergeMap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import { PartnerService } from '../../../../../shared/services/partner/partner.service';

@Component({
  selector: 'app-square-connection-modal',
  standalone: false,
  templateUrl: './square-connection-modal.component.html',
  styleUrls: ['./square-connection-modal.component.scss'],
})
export class SquareConnectionModalComponent implements OnInit {
  #activeModalService = inject(NgbActiveModal);
  #destroyRef = inject(DestroyRef);
  #partnerService = inject(PartnerService);
  #paymentService = inject(PaymentService);
  code = '';
  codeId = '';
  @Input() deviceId = '';
  error = false;
  loading = false;
  partnerId: number | null = null;
  @Input() planId?: number;
  @Input() squareConfiguration?: SquareConfiguration;

  clickOnCancel(): void {
    this.#activeModalService.close(null);
  }

  clickOnDisconnect(): void {
    this.#activeModalService.close({ deviceId: undefined });
  }

  ngOnInit(): void {
    if (!this.squareConfiguration || this.deviceId) {
      return;
    }
    this.#loadPairingCode();
  }

  #checkResponseData(
    response: BaseResponse<PairingStatus | SquarePairingCode | null>,
  ): Observable<BaseResponse<PairingStatus | SquarePairingCode | null>> {
    return response?.data ? of(response) : throwError(() => response);
  }

  #connectToSquare(pairingCodeData: SquarePairingCode): Observable<BaseResponse<PairingStatus>> {
    this.code = pairingCodeData.pairingCode;
    this.codeId = pairingCodeData.pairingCodeId;
    if (this.partnerId === null) {
      return throwError(() => new Error('Partner ID is required'));
    }
    return this.#paymentService.pairSquareStatus(this.partnerId, this.codeId).pipe(
      mergeMap((response: BaseResponse<PairingStatus>) => this.#checkResponseData(response) as Observable<BaseResponse<PairingStatus>>),
      takeUntilDestroyed(this.#destroyRef),
    );
  }

  #generatePairingCode(): Observable<BaseResponse<SquarePairingCode | null>> {
    if (this.partnerId === null) {
      return throwError(() => new Error('Partner ID is required'));
    }
    if (!this.squareConfiguration || !this.planId) {
      return throwError(() => new Error('Square configuration and plan ID are required'));
    }
    const body: CreateSquarePairingCode = {
      locationId: this.squareConfiguration.locationId,
      applicationId: this.squareConfiguration.applicationId,
      idempotencyKey: uuidv4(),
      planId: this.planId,
    };
    return this.#paymentService.pairSquareCode(this.partnerId, body);
  }

  #loadPairingCode(): void {
    this.partnerId = this.#partnerService.getPartner()?.id ?? null;
    this.loading = true;
    if (this.partnerId !== null) {
      this.#generatePairingCode()
        .pipe(
          mergeMap(
            (response: BaseResponse<SquarePairingCode | null>) =>
              this.#checkResponseData(response) as Observable<BaseResponse<SquarePairingCode>>,
          ),
          mergeMap((response: BaseResponse<SquarePairingCode | null>) => {
            if (response.data === null) {
              return throwError(() => 'No pairing code data');
            }
            return this.#connectToSquare(response.data);
          }),
          finalize(() => (this.loading = false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (response: BaseResponse<PairingStatus>) => {
            if (response && response.data !== null) {
              this.deviceId = response.data.externalId;
              this.#activeModalService.close({ deviceId: this.deviceId });
            }
          },
          error: () => (this.error = true),
        });
    }
  }
}
