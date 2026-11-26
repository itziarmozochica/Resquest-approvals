import type { TapToPayDeviceType, TapToPaySessionAnswer } from '@fz-original/app/payments/models/tap-to-pay.model';

import { HardwareTypeEnum, OnsiteSetup, OnsiteSetupPaymentConfiguration } from '../models/onsite-setup';

export function getTapToPayPaymentConfiguration(setup: OnsiteSetup | null): OnsiteSetupPaymentConfiguration | null {
  const paymentConfiguration = setup?.payment_configuration ?? null;
  const gateway = paymentConfiguration?.integrated_gateway ?? null;
  if (paymentConfiguration === null || gateway === null || gateway.provider !== 'adyen_local') {
    return null;
  }
  const providerConfig = gateway.provider_config;
  if (!providerConfig || !('tap_to_pay_enabled' in providerConfig)) {
    return null;
  }
  return providerConfig.tap_to_pay_enabled === true ? paymentConfiguration : null;
}

export function getTapToPayDeviceType(setup: OnsiteSetup | null): TapToPayDeviceType | undefined {
  return setup?.hardware_type === HardwareTypeEnum.dual_screen ? 'dualScreen' : undefined;
}

export function isTapToPayEnabled(setup: OnsiteSetup | null): boolean {
  return getTapToPayPaymentConfiguration(setup) !== null;
}

export function tapToPaySessionFailure(requestId: string, status: number, errorCode: string): TapToPaySessionAnswer {
  return { data: null, errorCode, requestId, status };
}
