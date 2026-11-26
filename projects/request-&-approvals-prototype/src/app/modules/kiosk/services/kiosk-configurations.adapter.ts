import { Injectable } from '@angular/core';

import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';

import { AdapterInterface } from '../../../core/adapter.interface';
import { LinkPaginationResponse } from '../../../shared/models/link-pagination-response';
import { KioskConfiguration } from '../models/kiosk-configuration';
import { KioskConfigurationDto } from './kiosk-configuration.dto';

@Injectable({
  providedIn: 'root',
})
export class KioskConfigurationsAdapter implements AdapterInterface<LinkPaginationResponse<KioskConfiguration[]>> {
  fromApi(response: any): LinkPaginationResponse<KioskConfiguration[]> {
    const body = response.body;
    return new LinkPaginationResponse<KioskConfiguration[]>(
      response.headers.get('Link'),
      this.#getData(body.data),
      this.#getError(body.error),
    );
  }

  #getData(data: KioskConfigurationDto[]): KioskConfiguration[] {
    let configurations: KioskConfiguration[] = [];

    if (data) {
      configurations = data.map(dto => {
        const row: KioskConfiguration = {
          id: dto.id,
          serial: dto.serial,
          pin: dto.pin,
          name: dto.name,
          plan_ids: dto.plan_ids,
          channelId: dto.subscription_channel ?? null,
          paymentTerminalId: dto.payment_terminal_id,
          paymentTerminalIp: dto.payment_terminal_ip,
          onsiteSetupId: dto.onsite_setup_id,
          apiKey: dto.saved_api_key,
        };
        if (dto.data_source_id !== undefined) {
          row.dataSourceId = dto.data_source_id == null || dto.data_source_id === '' ? null : String(dto.data_source_id).trim();
        }
        return row;
      });
    }
    return configurations;
  }

  #getError(data: any): BaseErrorResponse | null {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}
