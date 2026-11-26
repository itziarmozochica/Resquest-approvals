import { EventEmitter } from '@angular/core';
import { AbstractControl, UntypedFormGroup } from '@angular/forms';

import { PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { distinctUntilChanged } from 'rxjs/operators';

import {
  CutterTypeEnum,
  OboFlowTypeEnum,
  OboPrinterTypeEnum,
  PaperTypeEnum,
  PriceViewerEnum,
  ShiftStrategyEnum,
  TicketValidationTypeEnum,
} from '../../../../box-office/shared/models/onsite-setup';
import { SalesWindowConfig } from '../sales-window/models/sales-window.model';

export interface FormValue {
  maxQty?: number;
  label?: string;
  name?: string;
  price?: number;
  status?: boolean;
  visibility?: boolean;
  startDate?: string;
  startDatetime?: string;
  endDate?: string;
  endDatetime?: string;
  expirationDate?: string;
  expirationDatetime?: string;
  channelIdsToPublish?: string[];
  channelIdsToVisiblePublish?: string[];
  channelIdsToUnpublish?: string[];
  cashRegisterName?: string;
  cashRegisters?: string[];
  onlyTicketsForToday?: number;
  shiftsMandatory?: ShiftStrategyEnum;
  oboFlowType?: OboFlowTypeEnum;
  oneStepFlow?: OboFlowTypeEnum;
  hasNewPaper?: boolean;
  paperType?: PaperTypeEnum;
  hasCutter?: boolean;
  cutterType?: CutterTypeEnum;
  hasPriceViewer?: boolean;
  priceViewer?: PriceViewerEnum;
  showSoldOutSessions?: boolean;
  autovalidateTickets?: TicketValidationTypeEnum;
  enablePrintTicketsCombinedForPlans?: boolean;
  printTicketsCombinedForPlans?: number[];
  enableShiftMaxHoursOpen?: boolean;
  shiftMaxHoursOpen?: number;
  paymentMethods?: string[];
  oboPrinterType?: OboPrinterTypeEnum;
  squareLocationId?: string;
  squareApplicationId?: string;
  kioskPaymentGateway?: PaymentCheckoutET;
  salesWindow?: SalesWindowConfig;
  paymentExtraInformation?: string;
  prioritizedMainPlans?: number[];
  presetCouponCodes?: string[];
  retailSetupId?: string;
  warehouseId?: string;
  productsHolderPlanId?: number;
  validationProfiles?: string[];
  accessControlSetupId?: string;
}

export abstract class CommonEditFormComponent<T = FormValue> {
  timezone!: string;
  formGroup!: UntypedFormGroup;
  newValue: T | null = null;
  formLoaded = false;
  isOpen = false;
  formChanges!: EventEmitter<T | null>;
  protected errorPriority: string[] = [
    'required',
    'min',
    'max',
    'datesCrossError',
    'purchasableSinceAfterStartsAtError',
    'purchasableUntilAfterEndsAtError',
  ];

  save(): void {
    if (this.isSaveButtonDisabled()) {
      return;
    }
    this.emitNewFormValue(this.newValue);
  }

  cancel(): void {
    this.emitNewFormValue(null);
  }

  isSaveButtonDisabled(): boolean {
    return !this.newValue || !this.formGroup.valid;
  }

  protected abstract initForm(): void;

  protected abstract updateForm(): void;

  protected abstract emitNewFormValue(newValue: T | null): void;

  protected loadForm(): void {
    this.formLoaded = false;
    if (this.formGroup) {
      this.updateForm();
    } else {
      this.initForm();
      this.onValueChanges();
    }
    this.formLoaded = true;
  }

  protected onValueChanges(): void {
    this.formGroup.valueChanges.pipe(distinctUntilChanged()).subscribe(formObject => {
      if (this.formGroup.valid) {
        this.newValue = formObject;
      }
    });
  }

  protected reset(): void {
    this.formGroup.reset();
    this.newValue = null;
  }

  getControlError(control: AbstractControl): string | null {
    const errors = Object.getOwnPropertyNames(control.errors || {}).sort(
      (a, b) => this.errorPriority.indexOf(a) - this.errorPriority.indexOf(b),
    );

    return errors.length > 0 ? (errors.shift() ?? null) : null;
  }

  isDisabled(control: AbstractControl): boolean {
    return control.disabled;
  }
}
