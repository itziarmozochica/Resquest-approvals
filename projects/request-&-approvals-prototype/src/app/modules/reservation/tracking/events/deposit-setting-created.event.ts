import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositSettingsRule } from '../../models/deposit-settings-rule.model';
import { DepositSettingsTypeEnum } from '../../models/deposit-settings-type.enum';

export interface DepositSettingCreatedData {
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

export const depositSettingCreated = defineEvent<DepositSettingCreatedData>('reservation.depositSetting.created');
