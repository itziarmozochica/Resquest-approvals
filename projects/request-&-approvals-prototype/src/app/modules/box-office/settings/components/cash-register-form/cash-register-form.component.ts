import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';

import { CommonEditFormComponent, FormValue } from '../../../../sessions/shared/components/common-edit-form/common-edit-form.component';
import { CashRegister } from '../../../shared/models/cash-register';

@Component({
  selector: 'app-cash-register-form',
  standalone: false,
  templateUrl: './cash-register-form.component.html',
  styleUrls: ['../../../../sessions/shared/components/common-edit-form/common-edit-form.component.scss'],
})
export class CashRegisterFormComponent extends CommonEditFormComponent implements OnChanges {
  @Input() cashRegister?: CashRegister;
  @Output() formChanges: EventEmitter<FormValue | null> = new EventEmitter<FormValue | null>();

  constructor(private formBuilder: UntypedFormBuilder) {
    super();
    this.initForm();
    this.formLoaded = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.cashRegister?.currentValue) {
      this.loadForm();
    } else {
      this.reset();
    }
  }

  protected initForm(): void {
    this.formGroup = this.formBuilder.group({
      cashRegisterName: [this.cashRegister?.name, [Validators.required]],
      cashRegisterId: [this.cashRegister?.id],
    });
    this.onValueChanges();
  }

  protected updateForm(): void {
    this.formGroup.setValue(
      {
        cashRegisterName: this.cashRegister?.name,
        cashRegisterId: this.cashRegister?.id,
      },
      { emitEvent: false },
    );
  }

  protected emitNewFormValue(newValue: FormValue): void {
    this.formChanges.emit(newValue);
    this.reset();
  }
}
