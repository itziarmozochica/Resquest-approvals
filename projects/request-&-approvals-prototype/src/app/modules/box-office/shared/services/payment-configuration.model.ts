import { AdyenConfiguration } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { PayhereConfiguration } from '@fz-original/app/app/models/payment-checkout-payhere.model';
import { RazorpayConfiguration } from '@fz-original/app/app/models/payment-checkout-razorpay.model';
import { SquareConfiguration } from '@fz-original/app/app/models/payment-checkout-square.model';
import { AdyenLocalConfiguration } from '@fz-original/app/payments/models/local-terminal-payment.model';
import { isTapToPayDeviceId } from '@fz-original/app/payments/models/tap-to-pay.model';

/**
 * @todo move to app feature folder for models.
 *
 * Also related mocks.
 *
 * And decouple from functionality. Make it an interface.
 */
export class PaymentConfiguration {
  constructor(
    public adyenConfiguration?: AdyenConfiguration | null,
    public squareConfiguration?: SquareConfiguration | null,
    public razorpayConfiguration?: RazorpayConfiguration | null,
    public payhereConfiguration?: PayhereConfiguration | null,
    public deviceId?: string,
    public adyenLocalConfiguration?: AdyenLocalConfiguration | null,
  ) {}

  isConfigApplicable(): boolean {
    const adyenConfigApplicable =
      this.deviceId && this.adyenConfiguration?.devicesIds?.length && this.adyenConfiguration?.devicesIds?.length > 0;
    const squareConfigApplicable = this.squareConfiguration != null && this.deviceId != null;
    const razorpayConfigApplicable =
      this.deviceId && this.razorpayConfiguration?.devicesIds?.length && this.razorpayConfiguration?.devicesIds?.length > 0;
    const payhereConfigApplicable =
      this.deviceId && this.payhereConfiguration?.devicesIds?.length && this.payhereConfiguration?.devicesIds?.length > 0;
    const adyenLocalConfigApplicable =
      this.adyenLocalConfiguration != null &&
      (isTapToPayDeviceId(this.deviceId) || (this.adyenLocalConfiguration.devicesIds?.length ?? 0) > 0);
    return !!(
      this.deviceId &&
      (adyenConfigApplicable || squareConfigApplicable || razorpayConfigApplicable || payhereConfigApplicable || adyenLocalConfigApplicable)
    );
  }

  isAdyenConfigApplicable(): boolean {
    return !!(this.deviceId && this.adyenConfiguration?.devicesIds?.length && this.adyenConfiguration?.devicesIds?.length > 0);
  }

  hasCardConfig(): boolean {
    return (
      !!this.adyenConfiguration ||
      !!this.squareConfiguration ||
      !!this.razorpayConfiguration ||
      !!this.payhereConfiguration ||
      !!this.adyenLocalConfiguration
    );
  }

  clone(): PaymentConfiguration {
    return new PaymentConfiguration(
      this.adyenConfiguration?.clone(),
      this.squareConfiguration?.clone(),
      this.razorpayConfiguration,
      this.payhereConfiguration?.clone(),
      this.deviceId,
      this.adyenLocalConfiguration?.clone(),
    );
  }

  isEqual(other?: PaymentConfiguration): boolean {
    if (other === undefined) {
      return false;
    }
    if (this.deviceId !== other.deviceId) {
      return false;
    }
    const adyenEqual =
      (this.adyenConfiguration == null && other.adyenConfiguration == null) ||
      (this.adyenConfiguration != null && other.adyenConfiguration != null && this.adyenConfiguration.isEqual(other.adyenConfiguration));
    const squareEqual =
      (this.squareConfiguration == null && other.squareConfiguration == null) ||
      (this.squareConfiguration != null &&
        other.squareConfiguration != null &&
        this.squareConfiguration.isEqual(other.squareConfiguration));
    const payhereEqual =
      (this.payhereConfiguration == null && other.payhereConfiguration == null) ||
      (this.payhereConfiguration != null &&
        other.payhereConfiguration != null &&
        this.payhereConfiguration.isEqual(other.payhereConfiguration));
    const razorpayEqual =
      (this.razorpayConfiguration == null && other.razorpayConfiguration == null) ||
      (this.razorpayConfiguration != null &&
        other.razorpayConfiguration != null &&
        (this.razorpayConfiguration.devicesIds?.length ?? 0) === (other.razorpayConfiguration.devicesIds?.length ?? 0) &&
        (this.razorpayConfiguration.devicesIds ?? []).every(
          (val: string, index: number) => val === other.razorpayConfiguration?.devicesIds[index],
        ));
    const adyenLocalEqual =
      (this.adyenLocalConfiguration == null && other.adyenLocalConfiguration == null) ||
      (this.adyenLocalConfiguration != null &&
        other.adyenLocalConfiguration != null &&
        this.adyenLocalConfiguration.isEqual(other.adyenLocalConfiguration));
    return adyenEqual && squareEqual && payhereEqual && razorpayEqual && adyenLocalEqual;
  }
}
