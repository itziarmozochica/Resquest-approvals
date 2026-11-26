import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ExportTypeEnum } from '@fz-original/app/shared/components/export-list-button/export-option.model';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { DownloadFilesService } from '@fz-original/app/shared/services/download/download-files.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { emailValidator } from '@fz-original/app/shared/validators/email.validator';
import {
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_REF,
  IgntAlertComponent,
  IgntButtonComponent,
  IgntDialogModule,
  IgntDialogRef,
} from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { finalize, map, switchMap, throwIfEmpty } from 'rxjs/operators';

import { Business } from '../../../../settings/shared/models/business.model';
import { ReservationsService } from '../../../services/reservations.service';
import {
  PROFORMA_INVOICE_MIN_SEARCH_LENGTH,
  ProformaInvoiceDialogData,
  ProformaInvoiceDialogError,
  ProformaInvoiceDialogResult,
} from '../../models/proforma-invoice-dialog.model';
import { ProformaInvoiceRequest } from '../../models/proforma-invoice-request.model';
import { ProformaInvoiceBusinessService } from '../../services/proforma-invoice-business.service';
import { mergeBusinesses, toBusinessOption } from '../../utils/proforma-invoice-business.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntDialogModule,
    IgntInputFieldComponent,
    IgntTextareaFieldComponent,
    IgntTypeaheadModule,
    ReactiveFormsModule,
    SharedComponentsModule,
    TranslateModule,
  ],
  selector: 'app-proforma-invoice-dialog',
  styleUrl: './proforma-invoice-dialog.component.scss',
  templateUrl: './proforma-invoice-dialog.component.html',
})
export class ProformaInvoiceDialogComponent implements OnDestroy {
  readonly #businessService = inject(ProformaInvoiceBusinessService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject<IgntDialogRef<ProformaInvoiceDialogResult>>(IGNT_DIALOG_REF);
  readonly #downloadFilesService = inject(DownloadFilesService);
  readonly #formBuilder = inject(NonNullableFormBuilder);
  readonly #reservationsService = inject(ReservationsService);
  readonly #userService = inject(UserService);

  readonly #businesses = signal<Business[]>([]);
  readonly #error = signal<ProformaInvoiceDialogError | null>(null);
  readonly #isDownloading = signal(false);
  readonly #isLoadingBusiness = signal(false);
  readonly #load$ = new Subject<string>();
  readonly #refreshTrigger$ = new Subject<void>();
  #refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
  readonly #search$ = new Subject<string>();
  readonly #selectedBusiness = signal<Business | null>(null);

  protected readonly businessOptions = computed(() => this.#businesses().map(toBusinessOption));
  protected readonly canSearchBusinesses = this.#userService.hasPermission(Permissions.CAN_GET_BUSINESSES);
  protected readonly dialogData = inject<ProformaInvoiceDialogData>(IGNT_DIALOG_DATA);
  protected readonly error = this.#error.asReadonly();
  protected readonly errorMessageKey = computed(() =>
    this.error() === ProformaInvoiceDialogError.LOAD_BUSINESS
      ? 'reservations.proformaInvoice.dialog.loadBusinessError'
      : 'reservations.proformaInvoice.dialog.error',
  );
  protected readonly isDownloading = this.#isDownloading.asReadonly();
  protected readonly isLoadingBusiness = this.#isLoadingBusiness.asReadonly();
  protected readonly minSearchLength = PROFORMA_INVOICE_MIN_SEARCH_LENGTH;
  protected readonly recipientForm = this.#formBuilder.group({
    address: [''],
    billingName: [''],
    country: [''],
    email: ['', [emailValidator()]],
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    paymentNotes: [''],
    postalCode: ['', [Validators.maxLength(20)]],
    region: [''],
    taxId: ['', [Validators.maxLength(50)]],
  });
  protected readonly refreshTrigger$ = this.#refreshTrigger$.asObservable();
  protected readonly selectedBusiness = this.#selectedBusiness.asReadonly();
  protected readonly selectedBusinessOption = computed(() => {
    const business = this.selectedBusiness();
    return business === null ? undefined : toBusinessOption(business);
  });

  constructor() {
    this.#fillFormFromReservation();

    if (!this.canSearchBusinesses) {
      return;
    }

    this.#listenToLoad();
    this.#listenToSearch();
    if (this.dialogData.businessId !== null) {
      this.#loadBusiness(this.dialogData.businessId);
    }
  }

  ngOnDestroy(): void {
    this.#clearRefreshTimeout();
  }

  protected onBusinessSearch(term: string): void {
    this.#search$.next(term);
  }

  protected onBusinessSelected(option: SelectOption | undefined): void {
    const business = this.#businesses().find(candidate => candidate.id === option?.id);
    if (business === undefined) {
      return;
    }

    this.#selectedBusiness.set(business);
    this.#loadBusiness(business.id);
  }

  protected onCancel(): void {
    this.#dialogRef.close({ downloaded: false });
  }

  protected onCountrySelected(event: Event): void {
    this.recipientForm.controls.country.setValue((event.target as HTMLSelectElement).value);
    this.recipientForm.controls.country.markAsDirty();
  }

  protected onDownload(): void {
    if (this.isDownloading() || this.isLoadingBusiness()) {
      return;
    }

    if (this.recipientForm.invalid) {
      this.recipientForm.markAllAsTouched();
      return;
    }

    this.#error.set(null);
    this.#isDownloading.set(true);
    this.#reservationsService
      .exportPDFProformaInvoice(this.dialogData.reservationId, this.#toRequest(), this.dialogData.language)
      .pipe(
        throwIfEmpty(),
        finalize(() => this.#isDownloading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => this.#error.set(ProformaInvoiceDialogError.DOWNLOAD),
        next: (file: Blob) => {
          this.#downloadFilesService.downloadFile(file, ExportTypeEnum.PDF, `proforma-invoice.${this.dialogData.reservationId}.pdf`);
          this.#dialogRef.close({ downloaded: true });
        },
      });
  }

  #clearRefreshTimeout(): void {
    if (this.#refreshTimeoutId !== null) {
      clearTimeout(this.#refreshTimeoutId);
      this.#refreshTimeoutId = null;
    }
  }

  #fillForm(business: Business | null, paymentInstructions: string): void {
    this.recipientForm.reset({
      address: business?.address ?? '',
      billingName: business?.billingName ?? '',
      country: business?.countryCode ?? '',
      email: business?.email ?? '',
      name: business?.name ?? '',
      paymentNotes: paymentInstructions,
      postalCode: business?.postalCode ?? '',
      region: business?.region ?? '',
      taxId: business?.taxIdentificationNumber ?? '',
    });
  }

  #fillFormFromReservation(): void {
    this.recipientForm.patchValue({ email: this.dialogData.businessEmail ?? '', name: this.dialogData.businessName ?? '' });
  }

  #listenToLoad(): void {
    this.#load$
      .pipe(
        switchMap(businessId =>
          this.#businessService
            .get(businessId)
            .pipe(
              switchMap(business =>
                (business === null ? of('') : this.#businessService.paymentInstructions(business)).pipe(
                  map(paymentInstructions => ({ business, businessId, paymentInstructions })),
                ),
              ),
            ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ business, businessId, paymentInstructions }) => {
        this.#isLoadingBusiness.set(false);
        this.recipientForm.enable();
        this.#fillForm(business, paymentInstructions);
        if (business === null) {
          if (businessId === this.dialogData.businessId) {
            this.#fillFormFromReservation();
          }
          this.#error.set(ProformaInvoiceDialogError.LOAD_BUSINESS);
          return;
        }
        this.#selectedBusiness.set(business);
        this.#businesses.update(businesses =>
          mergeBusinesses(
            [business],
            businesses.filter(candidate => candidate.id !== business.id),
          ),
        );
      });
  }

  #listenToSearch(): void {
    this.#search$
      .pipe(
        switchMap(term => this.#businessService.search(term).pipe(map(businesses => ({ businesses, term })))),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ businesses, term }) => {
        const selected = this.selectedBusiness();
        this.#businesses.set(selected === null ? businesses : mergeBusinesses(businesses, [selected]));
        if (term !== '') {
          this.#scheduleRefresh();
        }
      });
    this.#search$.next('');
  }

  #loadBusiness(businessId: string): void {
    this.#error.set(null);
    this.#isLoadingBusiness.set(true);
    this.recipientForm.disable();
    this.#load$.next(businessId);
  }

  #scheduleRefresh(): void {
    this.#clearRefreshTimeout();
    this.#refreshTimeoutId = setTimeout(() => {
      this.#refreshTimeoutId = null;
      this.#refreshTrigger$.next();
    });
  }

  #toRequest(): ProformaInvoiceRequest {
    const { paymentNotes, ...recipient } = this.recipientForm.getRawValue();
    const orNull = (value: string): string | null => value.trim() || null;

    return {
      paymentNotes: orNull(paymentNotes),
      recipient: {
        address: orNull(recipient.address),
        billingName: orNull(recipient.billingName),
        country: orNull(recipient.country),
        email: orNull(recipient.email),
        name: recipient.name.trim(),
        postalCode: orNull(recipient.postalCode),
        region: orNull(recipient.region),
        taxId: orNull(recipient.taxId),
      },
    };
  }
}
