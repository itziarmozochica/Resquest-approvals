export class PayhereConfiguration {
  constructor(public devicesIds: string[]) {}

  clone(): PayhereConfiguration {
    return new PayhereConfiguration(this.devicesIds);
  }

  isEqual(other?: PayhereConfiguration): boolean {
    return this.devicesIds.every((val, index) => val === other?.devicesIds[index]);
  }
}

export interface PayhereCreateCheckoutBody {
  channelId: string;
  device_identifier: string;
  onsite_setup_id: string;
  payment_device_id: string;
  payment_method_type: string;
}

export interface PayhereCreateCheckoutBodyData {
  channel_id?: string;
  device_id?: string;
  onsite_setup_id: string;
  payhere_app_identifier: string;
  payment_method_type: string;
  user_id: number;
}
