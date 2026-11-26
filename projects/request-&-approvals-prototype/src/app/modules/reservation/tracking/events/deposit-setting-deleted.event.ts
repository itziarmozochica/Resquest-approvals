import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositSettingsTypeEnum } from '../../models/deposit-settings-type.enum';

export interface DepositSettingDeletedData {
  amount?: number;
  channelId?: string;
  depositSettingId: string;
  paymentWindowHours?: number;
  planId: number | null;
  termsAndConditionsUrl?: string;
  type?: DepositSettingsTypeEnum;
  warningMessage?: string;
}

export const depositSettingDeleted = defineEvent<DepositSettingDeletedData>('reservation.depositSetting.deleted');
