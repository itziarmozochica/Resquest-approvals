import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface CreateCashRegisterData {
  cashRegisterId: string;
  placeId: number;
}

export const createCashRegister = defineEvent<CreateCashRegisterData>('create.cashRegister');
