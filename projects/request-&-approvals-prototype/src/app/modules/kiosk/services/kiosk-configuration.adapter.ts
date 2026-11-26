import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../shared/models/base-response';
import { KioskConfiguration } from '../models/kiosk-configuration';
import { KioskConfigurationDto } from './kiosk-configuration.dto';

@Injectable({
  providedIn: 'root',
})
export class KioskConfigurationAdapter implements AdapterInterface<BaseResponse<KioskConfiguration>> {
  fromApi(response: any): BaseResponse<KioskConfiguration> {
    const body = response.body;
    return new BaseResponse(this.#getData(body.data), this.#getError(body.error));
  }

  #getData(data: KioskConfigurationDto): KioskConfiguration | null {
    let configuration: KioskConfiguration | null = null;

    if (data) {
      configuration = {
        id: data.id,
        serial: data.serial,
        pin: data.pin,
        name: data.name,
        plan_ids: data.plan_ids,
        channelId: data.subscription_channel ?? null,
        paymentTerminalId: data.payment_terminal_id,
        paymentTerminalIp: data.payment_terminal_ip,
        onsiteSetupId: data.onsite_setup_id,
        apiKey: data.saved_api_key,
      };
      if (data.data_source_id !== undefined) {
        configuration.dataSourceId = data.data_source_id == null || data.data_source_id === '' ? null : String(data.data_source_id).trim();
      }
    }
    return configuration;
  }

  #getError(data: any): BaseErrorResponse | null {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}
