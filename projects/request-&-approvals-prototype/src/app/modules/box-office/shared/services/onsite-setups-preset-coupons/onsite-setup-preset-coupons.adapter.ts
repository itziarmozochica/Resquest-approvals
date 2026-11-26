import { Injectable } from '@angular/core';

import { PresetCoupons, PresetCouponsDTO } from '@fz-original/app/modules/box-office/shared/models/preset-coupon';

import { AdapterInterface } from '../../../../../core/adapter.interface';

@Injectable({
  providedIn: 'root',
})
export class OnsiteSetupPresetCouponsAdapter implements AdapterInterface<PresetCoupons, PresetCouponsDTO> {
  fromApi(response: PresetCouponsDTO): PresetCoupons {
    return {
      lazyCoupons: response.lazy_coupons.map(presetCouponsDTO => ({
        code: presetCouponsDTO.code,
        title: presetCouponsDTO.title,
      })),
      coupons: response.coupons.map(presetCouponsDTO => ({
        code: presetCouponsDTO.code,
        title: presetCouponsDTO.title,
      })),
    };
  }
}
