import { inject, Injectable } from '@angular/core';

import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

import { DesktopOS, DeviceOS, DeviceType, FeverzoneDeviceType, MobileOS } from '../../models/device/device.model';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  #dualScreenStorageService: DualScreenStorageService = inject(DualScreenStorageService);
  #paymentConfigStorageService: PaymentConfigStorageService = inject(PaymentConfigStorageService);
  #userService: UserService = inject(UserService);

  getDeviceOS(): DeviceOS | undefined {
    const userAgent = this.getUserAgent();
    if (/windows phone/i.test(userAgent)) {
      return MobileOS.WindowsPhone;
    }
    if (/android/i.test(userAgent)) {
      return MobileOS.Android;
    }
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as Window & typeof globalThis & { MSStream: unknown; opera: unknown }).MSStream) {
      return MobileOS.iOS;
    }
    if (userAgent.includes('Win')) {
      return DesktopOS.Windows;
    }
    if (userAgent.includes('Mac')) {
      return DesktopOS.MacOS;
    }
    if (userAgent.includes('Linux')) {
      return DesktopOS.Linux;
    }

    return undefined;
  }

  getDeviceType(): DeviceType | null {
    const onsiteDevice = this.onsiteDevice();
    if (onsiteDevice !== null) {
      return onsiteDevice;
    }
    const deviceOS = this.getDeviceOS();
    if (deviceOS === MobileOS.Android || deviceOS === MobileOS.iOS || deviceOS === MobileOS.WindowsPhone) {
      return this.isTablet(deviceOS) ? DeviceType.Tablet : DeviceType.Mobile;
    }
    if (deviceOS === DesktopOS.Windows || deviceOS === DesktopOS.MacOS || deviceOS === DesktopOS.Linux) {
      return DeviceType.Desktop;
    }
    return null;
  }

  getFeverzoneDeviceType(): FeverzoneDeviceType {
    if (this.#dualScreenStorageService.containsData()) {
      return FeverzoneDeviceType.dual_screen;
    }
    return this.#paymentConfigStorageService.isMobilePos() ? FeverzoneDeviceType.mobile_pos : FeverzoneDeviceType.desktop;
  }

  private onsiteDevice(): DeviceType | null {
    if (this.#dualScreenStorageService.containsData()) {
      return DeviceType.DualScreen;
    }
    if (this.#paymentConfigStorageService.isMobilePos()) {
      return DeviceType.MobilePos;
    }
    if (this.#userService.getUser()?.isKiosk()) {
      return DeviceType.Kiosk;
    }
    return null;
  }

  private isTablet(deviceOS: DeviceOS): boolean {
    if (deviceOS === MobileOS.iOS && /iPad/.test(navigator.platform)) {
      return true;
    }
    if (deviceOS === MobileOS.Android && !/mobile/.test(navigator.userAgent.toLowerCase())) {
      return true;
    }
    return false;
  }

  getUserAgent(): string {
    return navigator.userAgent ?? (window as Window & typeof globalThis & { MSStream: unknown; opera: string }).opera ?? '';
  }
}
