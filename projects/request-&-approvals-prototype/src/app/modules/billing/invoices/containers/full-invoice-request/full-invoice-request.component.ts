import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Input,
  OnInit,
  signal,
  Signal,
  ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { BusinessService } from '@fz-original/app/modules/settings/shared/services/business.service';
import { toDistributorFiscalDetails } from '@fz-original/app/shared/services/distributor/distributor-business-update.mapper';
import { DistributorRouteService } from '@fz-original/app/shared/services/distributor/distributor-route.service';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { B2bIamAuthClient, type BaseResponse, type Distributor } from '@fz/b2b-iam';
import {
  buildNominativeRequestPayload,
  getCountryBlocks,
  nominativeServerFieldMap,
  requiredNominativeRequestFields,
  stripReasonPrefix,
  toCountrySelectorValue,
  type NominativeRequest,
  type NominativeRequestCountryBlocks,
  type NominativeRequestDocumentType,
  type NominativeRequestFormValue,
} from '@fz/invoicing';
import { IgntButtonComponent } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import countryCodes from '../../../../../shared/components/country-code-selector/country-codes';
import { SharedComponentsModule } from '../../../../../shared/components/shared-components.module';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { Business } from '../../../../settings/shared/models/business.model';
import { BusinessFormType } from '../../../../settings/shared/services/business-form.type';
import { BusinessQuery } from '../../../../settings/shared/services/business-query';
import { FullInvoiceDocumentTypeOption } from '../../models/nominative-request.model';
import { FullInvoiceRequestService } from '../../services/full-invoice-request.service';
import { getFullInvoiceDocumentTypeOptions, nominativeRequiredTextValidators } from '../../utils/nominative-request.util';

const alwaysRequiredFields: ReadonlySet<keyof NominativeRequestFormValue> = new Set(
  requiredNominativeRequestFields({ addressOptional: true, showItalyFields: false, showMexicoFields: false, taxIdOptional: true }),
);

// Only these are revalidated on a country or customer-type change: revalidating a control drops the
// server error set on it, and the fields whose requirement never changes must keep theirs.
const countryDependentFields: readonly (keyof NominativeRequestFormValue)[] = requiredNominativeRequestFields({
  addressOptional: false,
  showItalyFields: true,
  showMexicoFields: true,
  taxIdOptional: false,
}).filter(field => !alwaysRequiredFields.has(field));

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IgntButtonComponent, IgntInputFieldComponent, IgntRadioComponent, TranslateModule, SharedComponentsModule],
  selector: 'app-full-invoice-request',
  standalone: true,
  styleUrls: ['full-invoice-request.component.scss'],
  templateUrl: 'full-invoice-request.component.html',
  encapsulation: ViewEncapsulation.Emulated,
})
export class FullInvoiceRequestComponent implements OnInit {
  #activeModal = inject(NgbActiveModal);
  #businessService: BusinessService = inject(BusinessService);
  #destroyRef = inject(DestroyRef);
  readonly #distributorRoute = inject(DistributorRouteService);
  readonly #iamAuthClient = inject(B2bIamAuthClient);
  #documentType: WritableSignal<NominativeRequestDocumentType | null> = signal<NominativeRequestDocumentType | null>(null);
  #fb = inject(FormBuilder);
  #fullInvoiceRequestService = inject(FullInvoiceRequestService);
  #orderCountry: WritableSignal<string> = signal<string>('');
  #partnerService = inject(PartnerService);
  #selectedCountry: WritableSignal<string> = signal<string>('');
  #toastService: ToastService = inject(ToastService);
  readonly #translate = inject(TranslateService);
  readonly #userService = inject(UserService);
  private readonly countryIdByDefault = 'es';
  private iamBusiness: Business | null = null;

  @Input() businessId?: string;
  form!: FormGroup;
  isLoading: WritableSignal<boolean> = signal(false);
  @Input() orderId!: number;
  @Input() orderPartnerId?: number;
  @Input() purchaseUrn?: string;
  @Input() set orderCountryCode(value: string | undefined) {
    this.#orderCountry.set(value ?? '');
    this.#applyCountryValidators();
  }
  @Input() prefillData?: NominativeRequest | null;
  submitButtonLabelKey = 'invoicing.fullInvoice.buttons.request';

  protected readonly documentTypeOptions: Signal<ReadonlyArray<FullInvoiceDocumentTypeOption>> = computed(() =>
    getFullInvoiceDocumentTypeOptions(this.#selectedCountry(), this.#orderCountry()),
  );
  protected readonly countryBlocks: Signal<NominativeRequestCountryBlocks> = computed(() =>
    getCountryBlocks(this.#selectedCountry(), this.#orderCountry(), this.#documentType()),
  );

  canSaveForFuture(): boolean {
    return !!this.businessId || this.#distributorRoute.actingDistributorId() !== null;
  }

  ngOnInit(): void {
    this.initializeForm();
    this.form.controls['taxId'].valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => {
      const next = (value ?? '').toString().trim().toUpperCase();
      if (value !== next) {
        this.form.controls['taxId'].setValue(next, { emitEvent: false });
      }
    });
    this.form.controls['country'].valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((value: string) => {
      this.#selectedCountry.set(value ?? '');
      this.#applyCountryValidators();
    });
    this.form.controls['documentType'].valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((value: NominativeRequestDocumentType | null) => {
        this.#documentType.set(value ?? null);
        this.#applyCountryValidators();
      });
    this.#selectedCountry.set(this.form.controls['country'].value ?? '');
    this.#documentType.set(this.form.controls['documentType'].value ?? null);
    this.#applyCountryValidators();
    this.#prefillFromBusiness();
  }

  onCountrySelected(event: Event): void {
    const value = (event.target as HTMLSelectElement)?.value ?? '';
    this.form.controls['country'].setValue(value);
    this.form.controls['country'].markAsDirty();
  }

  onDocumentTypeSelected(value: NominativeRequestDocumentType): void {
    this.form.controls['documentType'].setValue(value);
    this.form.controls['documentType'].markAsDirty();
  }

  submit(): void {
    if (this.form.invalid) {
      this.#revealErrors();
      return;
    }
    const partnerId = this.#partnerService.getPartner()?.id;
    if (!partnerId) {
      this.#toastService.add({ translationKey: 'invoicing.fullInvoice.toasts.missingPartner', autoHide: true, type: ToastType.ERROR });
      return;
    }
    const payload = buildNominativeRequestPayload(
      this.form.value as NominativeRequestFormValue,
      this.countryBlocks(),
      this.#orderCountry(),
    );
    this.isLoading.set(true);
    (this.purchaseUrn
      ? this.#fullInvoiceRequestService.requestFullInvoiceByPurchaseUrn(partnerId, this.purchaseUrn, payload)
      : this.#fullInvoiceRequestService.requestFullInvoice(partnerId, this.orderId, payload, this.orderPartnerId)
    )
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          const successKey =
            this.submitButtonLabelKey === 'invoicing.fullInvoice.buttons.rectify'
              ? 'invoicing.fullInvoice.toasts.rectifySuccess'
              : 'invoicing.fullInvoice.toasts.requestSuccess';
          this.#toastService.add({ translationKey: successKey, autoHide: true, type: ToastType.SUCCESS });

          if (!this.form.value.saveForFuture) {
            this.#activeModal.close('submitted');
            return;
          }

          const businessFields = ['legalName', 'taxId', 'country', 'region', 'address', 'postalCode'] as const;
          const formValues = {
            legalName: (this.form.value.legalName ?? '').toString().trim(),
            taxId: (this.form.value.taxId ?? '').toString().trim(),
            country: (this.form.value.country ?? '').toString().trim(),
            region: (this.form.value.region ?? '').toString().trim(),
            address: (this.form.value.address ?? '').toString().trim(),
            postalCode: (this.form.value.postalCode ?? '').toString().trim(),
          };
          const currentValues = {
            legalName: (this.iamBusiness?.billingName ?? this.iamBusiness?.name ?? '').toString().trim(),
            taxId: (this.iamBusiness?.taxIdentificationNumber ?? '').toString().trim(),
            country: (this.iamBusiness?.countryCode ?? '').toString().trim(),
            region: (this.iamBusiness?.region ?? '').toString().trim(),
            address: (this.iamBusiness?.address ?? '').toString().trim(),
            postalCode: (this.iamBusiness?.postalCode ?? '').toString().trim(),
          };
          const businessChanged = businessFields.some(field => formValues[field] !== currentValues[field]);
          if (!businessChanged) {
            this.#activeModal.close('submitted');
            return;
          }

          const organizationId = this.#partnerService.getPartner()?.id;
          const businessId = this.businessId;
          const distributorId = this.#distributorRoute.actingDistributorId();
          const saveFailed = () =>
            this.#toastService.add({
              translationKey: 'invoicing.fullInvoice.toasts.saveForFutureError',
              autoHide: true,
              type: ToastType.ERROR,
            });
          const business = this.iamBusiness;
          const isBusinessUser: boolean = this.#userService.isBusiness();
          const businessQuery: BusinessQuery | null =
            organizationId && businessId ? this.#resolveBusinessQuery(organizationId, businessId, isBusinessUser) : null;
          if (!business) {
            saveFailed();
            this.#activeModal.close('submitted');
            return;
          }

          const body: BusinessFormType = {
            id: business.id,
            type: { id: business.type, title: '' },
            name: this.form.value.legalName ?? business.name,
            email: business.email ?? '',
            countryCode: this.form.value.country ?? business.countryCode ?? '',
            contactName: business.contactName ?? '',
            phone: business.phone ?? '',
            taxIdentificationNumber: this.form.value.taxId ?? business.taxIdentificationNumber,
            billingName: this.form.value.legalName ?? business.billingName ?? business.name,
            address: this.form.value.address ?? business.address,
            region: this.form.value.region ?? business.region,
            cityCode: this.form.value.cityCode ?? business.cityCode ?? '',
            postalCode: this.form.value.postalCode ?? business.postalCode ?? '',
            isManager: !!business.isManager,
            communicationsLanguage: business.language ?? '',
          };
          const save$: Observable<BaseResponse<unknown>> | null = this.#resolveSaveCall(distributorId, businessQuery, isBusinessUser, body);
          if (save$ === null) {
            saveFailed();
            this.#activeModal.close('submitted');
            return;
          }
          save$.subscribe({
            next: (response: { error?: unknown } | null) => {
              if (response?.error) {
                saveFailed();
              }
            },
            error: saveFailed,
          });

          this.#activeModal.close('submitted');
        },
        error: (err: { error?: { error?: { code?: number; message?: string; details?: Array<{ field: string; error: string }> } } }) => {
          const apiError = err?.error?.error;

          if (apiError?.code !== 1) {
            this.#toastService.add({ translationKey: 'invoicing.fullInvoice.toasts.error', autoHide: true, type: ToastType.ERROR });
            return;
          }

          const details = apiError.details;
          if (!details?.length) {
            this.#toastService.add({
              translationKey: 'invoicing.fullInvoice.toasts.validationFailed',
              autoHide: true,
              type: ToastType.ERROR,
            });
            return;
          }

          for (const detail of details) {
            const formControlName = nominativeServerFieldMap[detail.field];
            const message = stripReasonPrefix(detail.error);
            if (formControlName && this.form.controls[formControlName]) {
              this.form.controls[formControlName].setErrors({ serverError: { message } });
              this.form.controls[formControlName].markAsTouched();
            } else {
              this.#toastService.add({ message, autoHide: true, type: ToastType.ERROR });
            }
          }
        },
      });
  }

  #defaultCountry(): string {
    const orderCountry = toCountrySelectorValue(this.#orderCountry());
    return countryCodes.some(option => option.value === orderCountry) ? orderCountry : this.countryIdByDefault;
  }

  #applyCountryValidators(): void {
    if (!this.form) {
      return;
    }
    const required = new Set(requiredNominativeRequestFields(this.countryBlocks()));
    for (const field of countryDependentFields) {
      const control = this.form.controls[field];
      control.setValidators(required.has(field) ? [...nominativeRequiredTextValidators] : []);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  #isForbidden(failure: { error?: unknown } | null): boolean {
    if (failure === null) {
      return false;
    }
    if (failure.error instanceof HttpErrorResponse) {
      return failure.error.status === HttpStatusCode.Forbidden;
    }
    return this.#toastService.hasActiveToastWithMessage(this.#translate.instant('errors.ACCESS_FORBIDDEN'));
  }

  #notifyPrefillFailed(failure: { error?: unknown } | null = null): void {
    if (this.prefillData || this.#isForbidden(failure)) {
      return;
    }
    this.#toastService.add({ autoHide: true, translationKey: 'invoicing.fullInvoice.toasts.prefillError', type: ToastType.ERROR });
  }

  #prefillFromBusiness(): void {
    const distributorId = this.#distributorRoute.actingDistributorId();
    if (distributorId !== null) {
      this.#prefillFromDistributor(distributorId);
      return;
    }

    const organizationId: number | undefined = this.#partnerService.getPartner()?.id;
    const businessId = this.businessId;
    if (organizationId === undefined) {
      throw new Error('Partner not found');
    }

    if (!businessId) {
      return;
    }

    const isBusinessUser: boolean = this.#userService.isBusiness();
    const businessQuery: BusinessQuery | null = this.#resolveBusinessQuery(organizationId, businessId, isBusinessUser);
    if (businessQuery === null) {
      this.#notifyPrefillFailed();
      return;
    }

    this.isLoading.set(true);
    const business$: Observable<BaseResponse<Business | null>> = isBusinessUser
      ? this.#businessService.getMyBusiness(businessQuery)
      : this.#businessService.getBusiness(businessQuery);
    business$
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: resp => {
          if (resp.error) {
            this.#notifyPrefillFailed(resp.error);
            return;
          }
          const data = resp.data as Business | null;
          if (data) {
            this.iamBusiness = data;

            if (this.prefillData) {
              return;
            }

            this.form.patchValue({
              legalName: data.billingName ?? data.name ?? '',
              taxId: data.taxIdentificationNumber ?? '',
              country: data.countryCode || this.#defaultCountry(),
              region: data.region ?? '',
              address: data.address ?? '',
              postalCode: data.postalCode ?? '',
            });
          }
        },
      });
  }

  #prefillFromDistributor(distributorId: number): void {
    this.isLoading.set(true);
    this.#iamAuthClient
      .getDistributor(distributorId)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response: BaseResponse<Distributor>) => {
          if (response.error) {
            this.#notifyPrefillFailed(response.error);
            return;
          }
          const business = response.data?.business;
          if (!business) {
            return;
          }

          this.iamBusiness = {
            address: business.address,
            billingName: business.billingName ?? null,
            cityCode: business.cityCode ?? '',
            contactName: business.contactName,
            countryCode: business.countryCode ?? '',
            email: business.email,
            id: business.id,
            language: business.language,
            name: business.name,
            phone: business.phone,
            postalCode: business.postalCode ?? '',
            region: business.region ?? '',
            taxIdentificationNumber: business.taxIdentificationNumber,
          } as unknown as Business;

          if (this.prefillData) {
            return;
          }

          this.form.patchValue({
            legalName: business.billingName ?? business.name ?? '',
            taxId: business.taxIdentificationNumber ?? '',
            country: business.countryCode || this.#defaultCountry(),
            region: business.region ?? '',
            address: business.address ?? '',
            postalCode: business.postalCode ?? '',
          });
        },
      });
  }

  #resolveBusinessQuery(organizationId: number, businessId: string, isBusinessUser: boolean): BusinessQuery | null {
    if (!isBusinessUser) {
      return { businessId, organizationId };
    }

    const userId = this.#userService.getUserId();
    return userId === undefined ? null : { businessId, organizationId, userId };
  }

  #resolveSaveCall(
    distributorId: number | null,
    businessQuery: BusinessQuery | null,
    isBusinessUser: boolean,
    body: BusinessFormType,
  ): Observable<BaseResponse<unknown>> | null {
    if (distributorId !== null) {
      return this.#iamAuthClient.updateDistributor(distributorId, toDistributorFiscalDetails(body));
    }
    if (businessQuery === null) {
      return null;
    }
    return isBusinessUser
      ? this.#businessService.updateMyBusinessFiscalDetails(businessQuery, body)
      : this.#businessService.updateBusiness(businessQuery, body);
  }

  #revealErrors(): void {
    this.form.markAllAsTouched();
    const controls: AbstractControl[] = Object.values(this.form.controls);
    const serverErrors: [AbstractControl, ValidationErrors][] = controls
      .filter((control: AbstractControl): boolean => control.hasError('serverError'))
      .map((control: AbstractControl): [AbstractControl, ValidationErrors] => [control, control.errors ?? {}]);
    for (const control of controls) {
      control.updateValueAndValidity();
    }
    for (const [control, errors] of serverErrors) {
      control.setErrors(errors);
    }
  }

  private initializeForm(): void {
    const requiredText = [...nominativeRequiredTextValidators];
    this.form = this.#fb.group({
      legalName: ['', requiredText],
      taxId: ['', requiredText],
      country: [this.#defaultCountry(), Validators.required],
      locality: [''],
      region: ['', requiredText],
      address: ['', requiredText],
      postalCode: ['', requiredText],
      documentType: ['tax_id', Validators.required],
      fiscalRegimeCode: [''],
      mxCfdiUse: [''],
      sdiCodiceDestinatario: [''],
      saveForFuture: this.#fb.nonNullable.control(this.canSaveForFuture()),
    });

    if (this.prefillData) {
      const pd = this.prefillData;
      this.form.patchValue({
        legalName: pd.legalName ?? '',
        taxId: pd.taxId ?? '',
        country: (pd.countryCode || this.#defaultCountry()).toLowerCase(),
        locality: pd.locality ?? '',
        region: pd.region ?? '',
        address: pd.street ?? '',
        postalCode: pd.zipCode ?? '',
        documentType: pd.documentType ?? 'tax_id',
        fiscalRegimeCode: pd.fiscalRegimeCode ?? '',
        mxCfdiUse: pd.mxCfdiUse ?? '',
        sdiCodiceDestinatario: pd.sdiCodiceDestinatario ?? '',
      });
      this.submitButtonLabelKey = 'invoicing.fullInvoice.buttons.rectify';
    }
  }
}
