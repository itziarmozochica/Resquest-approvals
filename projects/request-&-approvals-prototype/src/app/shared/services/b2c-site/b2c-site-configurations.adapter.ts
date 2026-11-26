import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { B2CSiteConfiguration } from '../../../modules/resellers/models/b2c-site-configuration.model';
import { B2cSiteConfigurationDto } from '../../../modules/resellers/services/dtos/b2c-site-configuration.dto';
import { BaseResponse } from '../../models/base-response';

@Injectable({
  providedIn: 'root',
})
export class B2cSiteConfigurationsAdapter implements AdapterInterface<BaseResponse<Array<B2CSiteConfiguration>>> {
  fromApi(response: any): BaseResponse<Array<B2CSiteConfiguration>> {
    const body = response.body;
    return new BaseResponse<Array<B2CSiteConfiguration>>(this.getData(body.data), this.getError(body.error));
  }

  private getError(error: { code: string; message: string }): { code: string; message: string } | null {
    if (!error) {
      return null;
    }
    return { code: error.code, message: error.message };
  }

  private getData(data: B2cSiteConfigurationDto[]): Array<B2CSiteConfiguration> {
    let b2CSiteConfigurations: B2CSiteConfiguration[] = [];

    if (data) {
      b2CSiteConfigurations = data.map(b2cSiteConfiguration => {
        return {
          id: b2cSiteConfiguration.id,
          name: b2cSiteConfiguration.name,
          ownerId: b2cSiteConfiguration.owner_id,
          affiliateCode: b2cSiteConfiguration.affiliate_code,
          affiliateId: b2cSiteConfiguration.affiliate_id,
          channelId: b2cSiteConfiguration.channel_id,
          host: b2cSiteConfiguration.host,
          imageSelection: b2cSiteConfiguration.image_selection,
          imageUrl: b2cSiteConfiguration.image_url,
          partnerName: b2cSiteConfiguration.partner_name,
          partnerId: b2cSiteConfiguration.partner_id,
          affiliateCatalogViewUrl: b2cSiteConfiguration.affiliate_catalog_view_url,
        };
      });
    }
    return b2CSiteConfigurations;
  }
}
