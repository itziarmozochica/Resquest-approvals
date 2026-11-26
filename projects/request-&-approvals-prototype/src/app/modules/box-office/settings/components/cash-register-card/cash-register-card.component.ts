import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CashRegister } from '../../../shared/models/cash-register';

@Component({
  selector: 'app-cash-register-card',
  standalone: false,
  templateUrl: './cash-register-card.component.html',
  styleUrls: ['./cash-register-card.component.scss'],
})
export class CashRegisterCardComponent {
  @Input() cashRegister: CashRegister;
  @Output() edit = new EventEmitter<CashRegister>();
  @Output() delete = new EventEmitter<CashRegister>();
}
