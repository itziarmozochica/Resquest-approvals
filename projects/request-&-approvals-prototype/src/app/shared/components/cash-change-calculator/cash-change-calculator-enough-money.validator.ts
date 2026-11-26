import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn } from '@angular/forms';

export function CashChangeCalculatorEnoughMoneyValidator(minCashToReceive: number, cashToReceiveMandatory: boolean): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const isControlValueNaN = Number.isNaN(control.value);
    const mustValidate =
      (control.value != null && control.value !== '' && !isControlValueNaN) || (cashToReceiveMandatory && control.touched);
    const hasEnoughMoneyError = isControlValueNaN || control.value < minCashToReceive;

    return mustValidate && hasEnoughMoneyError ? { cashChangeCalculatorEnoughMoney: true } : null;
  };
}

@Directive({
  selector: '[appCashChangeCalculatorEnoughMoneyValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: CashChangeCalculatorEnoughMoneyValidatorDirective, multi: true }],
  standalone: true,
})
export class CashChangeCalculatorEnoughMoneyValidatorDirective implements Validator {
  /**
   * Indicates whether having an input value is mandatory in order to perform the validation or not.
   */
  @Input() cashToReceiveMandatory = false;
  /**
   * Minimun value to validate against
   */
  @Input() minCashToReceive = 0;

  validate(control: AbstractControl): ValidationErrors | null {
    return CashChangeCalculatorEnoughMoneyValidator(this.minCashToReceive, this.cashToReceiveMandatory)(control);
  }
}
