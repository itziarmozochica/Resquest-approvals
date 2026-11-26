import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../../core/adapter.interface';
import { CashRegister, CashRegisterDTO } from '../../models/cash-register';

@Injectable({
  providedIn: 'root',
})
export class CashRegistersAdapter implements AdapterInterface<Array<CashRegisterDTO>, Array<CashRegister>> {
  fromApi(response: Array<CashRegisterDTO>): Array<CashRegister> {
    return response;
  }
}
