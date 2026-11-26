import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { PaymentMethod, PaymentMethodOption } from '@fz-original/app/modules/box-office/checkout/models/payment-method.model';
import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { PartnerCustomPaymentMethod } from '@fz-original/app/shared/models/partner/partner-config.model';
import { PartnerConfigService } from '@fz-original/app/shared/services/partner-config/partner-config.service';
import { distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-box-office-payment-method',
  standalone: false,
  templateUrl: './payment-method.component.html',
  styleUrls: ['./payment-method.component.scss'],
})
export class PaymentMethodComponent implements OnChanges, OnInit {
  paymentMethodForm!: UntypedFormGroup;
  paymentMethodOptionList: PaymentMethodOption[] = [];
  showReceiptDocumentBanner = false;
  paymentMethodSelected!: PaymentMethod;
  @Input() paymentMethods: Map<string, PaymentMethodOption> = new Map();
  @Output() updateData: EventEmitter<PaymentMethod | undefined> = new EventEmitter<PaymentMethod | undefined>();
  @Output() receiptDocumentChange: EventEmitter<string> = new EventEmitter();

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.paymentMethods?.currentValue || this.paymentMethods.size === 0) {
      return;
    }
    if (this.isCurrentValueDisabled()) {
      this.paymentMethodForm.reset();
      this.updateData.emit(undefined);
    }
    this.loadPaymentMethods();
  }

  ngOnInit(): void {
    this.loadPaymentMethods();
  }

  private loadPaymentMethods(): void {
    if (this.paymentMethods.size === 0) {
      return;
    }
    this.paymentMethodOptionList = Array.from(this.paymentMethods.values());
    const paymentMethodsEnabled: Array<PaymentMethodOption> = this.paymentMethodOptionList.filter(
      (paymentMethodOption: PaymentMethodOption) => !paymentMethodOption.disabled,
    );

    const initialPaymentType: PaymentType | '' = this.#resolveInitialPaymentType(paymentMethodsEnabled);

    this.paymentMethodForm = this.formBuilder.group({
      paymentType: [initialPaymentType, [Validators.required]],
    });
    this.updateData.emit(initialPaymentType ? { paymentType: initialPaymentType } : undefined);
    this.onValueChanges();
  }

  #resolveInitialPaymentType(paymentMethodsEnabled: PaymentMethodOption[]): PaymentType | '' {
    const previouslySelected = this.paymentMethodSelected?.paymentType;
    if (previouslySelected && paymentMethodsEnabled.some(option => option.method === previouslySelected)) {
      return previouslySelected;
    }
    if (paymentMethodsEnabled.length === 1) {
      return paymentMethodsEnabled[0].method;
    }
    return '';
  }

  constructor(
    private formBuilder: UntypedFormBuilder,
    private partnerConfigService: PartnerConfigService,
  ) {}

  private isCurrentValueDisabled(): boolean {
    if (!this.paymentMethodForm) {
      return false;
    }
    const paymentTypeControl = this.paymentMethodForm.get('paymentType');
    return this.paymentMethods.get(paymentTypeControl?.value)?.disabled ?? false;
  }

  private onValueChanges(): void {
    this.paymentMethodForm.valueChanges.pipe(distinctUntilChanged()).subscribe(formObject => {
      if (this.isCurrentValueDisabled()) {
        this.paymentMethodForm.reset({}, { emitEvent: false });
        return;
      }

      this.paymentMethodSelected = { paymentType: formObject['paymentType'] };
      this.showReceiptDocumentBanner = this.isCustomPaymentMethod(this.paymentMethodSelected.paymentType);

      const resetPaymentMethod = !this.paymentMethodForm.valid || this.showReceiptDocumentBanner;
      this.updateData.emit(resetPaymentMethod ? undefined : this.paymentMethodSelected);
    });
  }

  onReceiptDocumentChange(documentDescription: string): void {
    this.receiptDocumentChange.emit(documentDescription);
    const paymentMethodSelected = documentDescription ? this.paymentMethodSelected : undefined;
    this.updateData.emit(paymentMethodSelected);
  }

  private isCustomPaymentMethod(paymentType: string): boolean {
    const customMethodConfig = this.findCustomMethodConfig(paymentType);
    if (!customMethodConfig) {
      return false;
    }

    return this.hasAnyBannerFlagEnabled(customMethodConfig);
  }

  get helperTextKey(): string {
    if (!this.paymentMethodSelected) {
      return 'boxOffice.receiptDocument.helperWithReceiptDocumentMethod';
    }

    const customMethodConfig = this.findCustomMethodConfig(this.paymentMethodSelected.paymentType);
    if (!customMethodConfig) {
      return 'boxOffice.receiptDocument.helperWithReceiptDocumentMethod';
    }

    return this.getHelperTextForCustomMethod(customMethodConfig);
  }

  get titleKey(): string {
    if (!this.paymentMethodSelected) {
      return 'boxOffice.receiptDocument.title';
    }

    const customMethodConfig = this.findCustomMethodConfig(this.paymentMethodSelected.paymentType);
    if (!customMethodConfig) {
      return 'boxOffice.receiptDocument.title';
    }

    return this.getTitleForCustomMethod(customMethodConfig);
  }

  private isPartnerCustomPaymentMethod(paymentType: string): boolean {
    const customMethodConfig = this.findCustomMethodConfig(paymentType);
    if (!customMethodConfig) {
      return false;
    }

    return this.hasAnyBannerFlagEnabled(customMethodConfig);
  }

  private findCustomMethodConfig(paymentType: string): PartnerCustomPaymentMethod | undefined {
    const partnerConfig = this.partnerConfigService.config;
    const customMethods = partnerConfig?.payments?.customMethods || [];
    return customMethods.find(method => method.method === paymentType);
  }

  private hasAnyBannerFlagEnabled(customMethodConfig: PartnerCustomPaymentMethod): boolean {
    const hasStaffNotesEnabled = customMethodConfig.enableStaffNotes === true;
    const hasPaymentDetailsEnabled = customMethodConfig.enablePaymentDetails === true;

    const partnerConfig = this.partnerConfigService.config;
    const hasGlobalStaffNotesEnabled = partnerConfig?.payments?.enableStaffNotes === true;

    return hasStaffNotesEnabled || hasPaymentDetailsEnabled || hasGlobalStaffNotesEnabled;
  }

  private getHelperTextForCustomMethod(customMethodConfig: PartnerCustomPaymentMethod): string {
    if (customMethodConfig.enableStaffNotes === true) {
      return 'boxOffice.receiptDocument.helperWithStaffNotes';
    }

    const partnerConfig = this.partnerConfigService.config;
    if (partnerConfig?.payments?.enableStaffNotes === true) {
      return 'boxOffice.receiptDocument.helperWithStaffNotes';
    }

    if (customMethodConfig.enablePaymentDetails === true) {
      return 'boxOffice.receiptDocument.helperWithReceiptDocumentMethod';
    }

    return 'boxOffice.receiptDocument.helperWithReceiptDocumentMethod';
  }

  private getTitleForCustomMethod(customMethodConfig: PartnerCustomPaymentMethod): string {
    if (customMethodConfig.enableStaffNotes === true) {
      return 'boxOffice.receiptDocument.staffNotesTitle';
    }

    const partnerConfig = this.partnerConfigService.config;
    if (partnerConfig?.payments?.enableStaffNotes === true) {
      return 'boxOffice.receiptDocument.staffNotesTitle';
    }

    if (customMethodConfig.enablePaymentDetails === true) {
      return 'boxOffice.receiptDocument.paymentDetailsTitle';
    }

    return 'boxOffice.receiptDocument.title';
  }
}
