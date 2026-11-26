import { inject } from '@angular/core';

import { DeviceService } from '@fz-original/app/shared/services/device/device.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

import packageJson from '../../../../package.json';

/**
 * Factory function to provide the context for the Feverzone tracking system.
 * @returns A record containing the device type, Feverzone version, partner information, and user information.
 */
export function feverzoneContextFactory(): Record<string, unknown> {
  const partnerService = inject(PartnerService);
  const userService = inject(UserService);
  const deviceService = inject(DeviceService);
  const partner = partnerService.getPartner();
  const user = userService.getUser();

  return {
    device: deviceService.getDeviceType(),
    feverzone_version: packageJson.version,
    partner_country: partner?.countryCode,
    partner_id: partner?.id,
    partner_name: partner?.name,
    user_email: user?.email,
    user_name: user?.name,
  };
}
