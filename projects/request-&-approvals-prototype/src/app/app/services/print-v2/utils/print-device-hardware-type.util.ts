import { HardwareTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { FeverzoneDeviceType } from '@fz-original/app/shared/models/device/device.model';

import { PrintDeviceHardwareType } from '../models/print-block.model';

export function toPrintDeviceHardwareType(deviceType: FeverzoneDeviceType): PrintDeviceHardwareType | null {
  switch (deviceType) {
    case FeverzoneDeviceType.desktop:
      return HardwareTypeEnum.desktop;
    case FeverzoneDeviceType.dual_screen:
      return HardwareTypeEnum.dual_screen;
    default:
      return null;
  }
}
