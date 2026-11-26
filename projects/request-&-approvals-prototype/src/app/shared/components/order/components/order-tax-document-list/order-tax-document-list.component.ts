import { ChangeDetectorRef, Component, DestroyRef, inject, Input, input, InputSignal, Signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { FullInvoiceRequestComponent } from '@fz-original/app/modules/billing/invoices/containers/full-invoice-request/full-invoice-request.component';
import { FullInvoiceRequestService } from '@fz-original/app/modules/billing/invoices/services/full-invoice-request.service';
import { ReservationsService } from '@fz-original/app/modules/reservation/services/reservations.service';
import { ExportTypeEnum } from '@fz-original/app/shared/components/export-list-button/export-option.model';
import { DownloadFilesService } from '@fz-original/app/shared/services/download/download-files.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { type NominativeRequest } from '@fz/invoicing';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, merge, Observable, of, ReplaySubject } from 'rxjs';
import { catchError, filter, map, startWith, switchMap, tap } from 'rxjs/operators';

import { trackById } from '../../../../../shared/utils/track-by';
import { TaxDocument, TaxDocumentComponentEnum } from '../../../../models/tax-document/tax-document.model';
import { PartnerService } from '../../../../services/partner/partner.service';
import { TaxDocumentService } from '../../../../services/tax-document/tax-document.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { isSingleComponentTaxDocument } from '../../utils/tax-document-component.util';
import { NominativeRequestStatus } from './nominative-request-status.enum';

export { NominativeRequestStatus };

@Component({
  selector: 'app-order-tax-document-list',
  standalone: false,
  styleUrl: './order-tax-document-list.component.scss',
  templateUrl: './order-tax-document-list.component.html',
})
export class OrderTaxDocumentListComponent {
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #destroyRef: DestroyRef = inject(DestroyRef);
  readonly #downloadFilesService = inject(DownloadFilesService);
  readonly #fullInvoiceRequestService: FullInvoiceRequestService = inject(FullInvoiceRequestService);
  readonly #modal = inject(NgbModal);
  readonly #partnerService: PartnerService = inject(PartnerService);
  readonly #reservationsService = inject(ReservationsService);
  readonly #taxDocumentService = inject(TaxDocumentService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  private _orderId: number | null = null;
  private _purchaseUrn: string | null = null;
  @Input() businessId?: string | null = null;
  @Input() orderPartnerId?: number;
  @Input() set orderId(value: number) {
    this._orderId = value;
    this.orderId$$.next(value);
    if (value) {
      this.#checkNominativeRequestStatus(value);
    }
  }
  @Input() set purchaseUrn(value: string | undefined) {
    this._purchaseUrn = value ?? null;
    this.purchaseUrn$$.next(value);
    if (value) {
      this.#checkNominativeRequestStatusByPurchaseUrn(value);
    }
  }
  get purchaseUrn(): string | undefined {
    return this._purchaseUrn ?? undefined;
  }
  private readonly orderId$$ = new ReplaySubject<number>(1);
  private readonly purchaseUrn$$ = new ReplaySubject<string | undefined>(1);
  readonly NominativeRequestStatus = NominativeRequestStatus;
  buttonLabelKey = 'invoicing.fullInvoice.buttons.request';
  hasError = false;
  @Input() isCollapsed = false;
  readonly tileLayout = input(false);
  isSplitOrder = false;
  nominativeData: NominativeRequest | null = null;
  readonly orderCountryCode: InputSignal<string | undefined> = input<string | undefined>(undefined);
  readonly orderTaxDocuments$: Observable<Array<TaxDocument> | null>;
  readonly taxDocuments: Signal<Array<TaxDocument> | null>;
  requestStatus: NominativeRequestStatus = NominativeRequestStatus.None;
  readonly reservationId: InputSignal<string | undefined> = input<string | undefined>(undefined);
  readonly #reservationBusinessId: Signal<string | null> = toSignal(
    toObservable(this.reservationId).pipe(switchMap(reservationId => this.#getBusinessId(reservationId).pipe(startWith(null)))),
    { initialValue: null },
  );
  readonly trackByIdFn = trackById;

  get hasOrderId(): boolean {
    return this._orderId !== null;
  }

  get hasPurchaseUrn(): boolean {
    return this._purchaseUrn !== null;
  }

  constructor() {
    const byOrderId$ = this.orderId$$.pipe(
      filter((orderId): orderId is number => Boolean(orderId)),
      switchMap(orderId => this.#getTaxDocumentRequest(orderId)),
    );
    const byPurchaseUrn$ = this.purchaseUrn$$.pipe(
      filter((urn): urn is string => Boolean(urn)),
      switchMap(urn => this.#getTaxDocumentRequestByPurchaseUrn(urn)),
    );
    this.orderTaxDocuments$ = merge(byOrderId$, byPurchaseUrn$);
    this.taxDocuments = toSignal(this.orderTaxDocuments$, { initialValue: null });
  }

  downloadTaxDocument(taxDocument: TaxDocument): void {
    this.#taxDocumentService
      .downloadTaxDocument(taxDocument.fileUrl)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (file: Blob) => {
          this.#downloadFilesService.downloadFile(file, ExportTypeEnum.PDF, `tax-document-${taxDocument.id}.pdf`);
        },
        error: () => {
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant('validateTicketsNew.orderTaxDocumentList.error'),
            sentiment: AlertSentiment.warning,
          });
        },
      });
  }

  isSectionVisible(taxDocuments: Array<TaxDocument> | null): boolean {
    if (this.hasError) {
      return true;
    }
    if (taxDocuments === null) {
      return false;
    }
    return taxDocuments.length > 0 || this.requestStatus === NominativeRequestStatus.Failed;
  }

  requestFullInvoice(): void {
    const ref = this.#modal.open(FullInvoiceRequestComponent, {
      windowClass: 'full-invoice-request-modal',
      backdropClass: 'backdrop-light',
      centered: false,
      animation: true,
    });
    const id = this._orderId;
    const purchaseUrn = this._purchaseUrn;
    ref.componentInstance.orderId = id;
    ref.componentInstance.orderPartnerId = this.orderPartnerId;
    if (purchaseUrn) {
      ref.componentInstance.purchaseUrn = purchaseUrn;
    }
    if (this.nominativeData) {
      ref.componentInstance.prefillData = this.nominativeData;
    }
    const businessId = this.businessId ?? this.#reservationBusinessId();
    if (businessId) {
      ref.componentInstance.businessId = businessId;
    }
    ref.componentInstance.orderCountryCode = this.orderCountryCode();

    ref.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: string | undefined) => {
      if (result !== 'submitted') {
        return;
      }
      if (purchaseUrn) {
        this.#checkNominativeRequestStatusByPurchaseUrn(purchaseUrn);
      } else if (id) {
        this.#checkNominativeRequestStatus(id);
      }
    });
  }

  #getTaxDocumentRequest(orderId: number): Observable<Array<TaxDocument> | null> {
    this.hasError = false;
    return this.#taxDocumentService
      .getTaxDocumentsByOrderId(orderId, this.orderPartnerId)
      .pipe(
        map(response => response.data),
        filter((data: Array<TaxDocument> | null): data is Array<TaxDocument> => Array.isArray(data)),
        map((docs: Array<TaxDocument>) => this.#sortByComponent(docs.filter(doc => Boolean(doc?.fileUrl)))),
        catchError(() => {
          this.hasError = true;
          return of(null);
        }),
      )
      .pipe(
        tap((data: Array<TaxDocument> | null): void => {
          this.isSplitOrder = data !== null && this.#hasBothComponents(data);
        }),
        startWith<Array<TaxDocument> | null>(null),
      );
  }

  #getTaxDocumentRequestByPurchaseUrn(purchaseUrn: string): Observable<Array<TaxDocument> | null> {
    this.hasError = false;
    return this.#taxDocumentService
      .getTaxDocumentsByPurchaseUrn(purchaseUrn)
      .pipe(
        map(response => response.data),
        filter((data: Array<TaxDocument> | null): data is Array<TaxDocument> => Array.isArray(data)),
        map((docs: Array<TaxDocument>) => this.#sortByComponent(docs.filter(doc => Boolean(doc?.fileUrl)))),
        catchError(() => {
          this.hasError = true;
          return of(null);
        }),
      )
      .pipe(
        tap((data: Array<TaxDocument> | null): void => {
          this.isSplitOrder = data !== null && this.#hasBothComponents(data);
        }),
        startWith<Array<TaxDocument> | null>(null),
      );
  }

  #componentOrder(taxDocument: TaxDocument): number {
    return taxDocument.component === TaxDocumentComponentEnum.SURCHARGE ? 1 : 0;
  }

  #hasBothComponents(taxDocuments: Array<TaxDocument>): boolean {
    return (
      taxDocuments.some(doc => doc.component === TaxDocumentComponentEnum.TICKET) &&
      taxDocuments.some(doc => doc.component === TaxDocumentComponentEnum.SURCHARGE)
    );
  }

  #sortByComponent(taxDocuments: Array<TaxDocument>): Array<TaxDocument> {
    const ticketBeforeSurcharge = taxDocuments
      .filter(doc => isSingleComponentTaxDocument(doc))
      .sort((a, b) => this.#componentOrder(a) - this.#componentOrder(b));

    let nextSlot = 0;
    return taxDocuments.map(doc => (isSingleComponentTaxDocument(doc) ? ticketBeforeSurcharge[nextSlot++] : doc));
  }

  #checkNominativeRequestStatus(orderId: number): void {
    const partnerId = this.#partnerService.getActingOrganizationId();
    if (!partnerId) {
      return;
    }
    this.#applyNominativeRequestStatus(this.#fullInvoiceRequestService.getNominativeRequestStatus(partnerId, orderId, this.orderPartnerId));
  }

  #checkNominativeRequestStatusByPurchaseUrn(purchaseUrn: string): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (!partnerId) {
      return;
    }
    this.#applyNominativeRequestStatus(this.#fullInvoiceRequestService.getNominativeRequestStatusByPurchaseUrn(partnerId, purchaseUrn));
  }

  #applyNominativeRequestStatus(status$: Observable<NominativeRequest | null>): void {
    status$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: data => {
        if (!data) {
          this.requestStatus = NominativeRequestStatus.None;
          this.buttonLabelKey = 'invoicing.fullInvoice.buttons.request';
          this.nominativeData = null;
          this.#changeDetectorRef.markForCheck();
          return;
        }
        this.requestStatus = this.#resolveStatus(data);
        const isRectifiable =
          this.requestStatus === NominativeRequestStatus.Completed || this.requestStatus === NominativeRequestStatus.Failed;
        this.buttonLabelKey = isRectifiable ? 'invoicing.fullInvoice.buttons.rectify' : 'invoicing.fullInvoice.buttons.request';
        this.nominativeData = isRectifiable ? data : null;
        this.#changeDetectorRef.markForCheck();
      },
      error: err => {
        const status = err?.status as number | undefined;
        const isForeignOrder = (err?.error?.error?.code as string | number | undefined) === 'ORDER_NOT_FOUND';
        if (status === 404 && !isForeignOrder) {
          this.requestStatus = NominativeRequestStatus.None;
          this.buttonLabelKey = 'invoicing.fullInvoice.buttons.request';
          this.nominativeData = null;
          this.#changeDetectorRef.markForCheck();
          return;
        }
        if (status === 422) {
          this.requestStatus = NominativeRequestStatus.Blocked;
          this.#changeDetectorRef.markForCheck();
          return;
        }
        this.requestStatus = NominativeRequestStatus.Error;
        this.#changeDetectorRef.markForCheck();
      },
    });
  }

  #resolveStatus(data: NominativeRequest): NominativeRequestStatus {
    if (data.status === 'completed') {
      return NominativeRequestStatus.Completed;
    }
    if (data.status === 'failed') {
      return NominativeRequestStatus.Failed;
    }
    return NominativeRequestStatus.Pending;
  }

  #getBusinessId(reservationId: string | undefined): Observable<string> {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (!reservationId || this.businessId || !partnerId || !this.#userService.hasPermission(Permissions.CAN_REQUEST_FULL_INVOICE)) {
      return EMPTY;
    }
    const reservation$ = this.#userService.isBusiness()
      ? this.#reservationsService.getReservation({ partnerId, reservationId, userId: this.#userService.getUser()?.id })
      : this.#reservationsService.getReservation({ partnerId, reservationId });
    return reservation$.pipe(
      map(reservationResp => reservationResp.data?.reservationData?.businessId ?? null),
      filter((businessId): businessId is string => businessId !== null),
      catchError(() => EMPTY),
    );
  }
}
