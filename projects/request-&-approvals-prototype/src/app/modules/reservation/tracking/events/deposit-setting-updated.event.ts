import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositSettingsRule } from '../../models/deposit-settings-rule.model';
import { DepositSettingsTypeEnum } from '../../models/deposit-settings-type.enum';

export interface DepositSettingUpdatedData {
  amount: number;
  channelId: string;
  depositSettingId: string;
  paymentWindowHours: number;
  planId: number;
  rules: DepositSettingsRule[];
  termsAndConditionsUrl: string;
  type: DepositSettingsTypeEnum;
  warningMessage: string;
}

export const depositSettingUpdated = defineEvent<DepositSettingUpdatedData>('reservation.depositSetting.updated');
