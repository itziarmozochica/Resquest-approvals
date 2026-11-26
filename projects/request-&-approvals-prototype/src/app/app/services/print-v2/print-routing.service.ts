import { inject, Injectable } from '@angular/core';

import { HardwareTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { DeviceService } from '@fz-original/app/shared/services/device/device.service';

import { PrintDeviceHardwareType } from './models/print-block.model';
import { PrintCommandPrinterType } from './models/print-command.model';
import { PrintLegacyReason, PrintRoute, PrintRouteFlag, PrintRouteType } from './models/print-route.model';
import { PrintCommandBuilderService, PrintJob } from './print-command-builder.service';
import { toPrintDeviceHardwareType } from './utils/print-device-hardware-type.util';

@Injectable({
  providedIn: 'root',
})
export class PrintRoutingService {
  static readonly printerFlags: Readonly<Partial<Record<PrintCommandPrinterType, PrintRouteFlag>>> = {
    [PrintCommandPrinterType.browser_pdf]: FeatureFlags.BROWSER_PDF_TICKET_RENDERING,
    [PrintCommandPrinterType.zebra]: {
      [HardwareTypeEnum.desktop]: FeatureFlags.ZEBRA_DESKTOP_TICKET_RENDERING,
      [HardwareTypeEnum.dual_screen]: FeatureFlags.ZEBRA_DUAL_SCREEN_TICKET_RENDERING,
    },
  };

  readonly #deviceService = inject(DeviceService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #printCommandBuilderService = inject(PrintCommandBuilderService);

  resolve(job: PrintJob): PrintRoute {
    const printableOrders: Order[] = this.#printCommandBuilderService.getPrintableOrders(job.orders);
    if (printableOrders.length === 0) {
      return { type: PrintRouteType.skipped };
    }
    const printerType: PrintCommandPrinterType = this.#printCommandBuilderService.resolvePrinterType(job);
    const printerFlag: PrintRouteFlag | undefined = PrintRoutingService.printerFlags[printerType];
    if (printerFlag === undefined) {
      return { reason: PrintLegacyReason.printer_not_migrated, type: PrintRouteType.legacy };
    }
    const flag: FeatureFlags | undefined = this.#getDeviceFlag(printerFlag);
    if (flag === undefined) {
      return { reason: PrintLegacyReason.device_not_migrated, type: PrintRouteType.legacy };
    }
    const flagLegacyReason: PrintLegacyReason | null = this.#getFlagLegacyReason(flag, printableOrders);
    if (flagLegacyReason !== null) {
      return { reason: flagLegacyReason, type: PrintRouteType.legacy };
    }

    return { type: PrintRouteType.revamped };
  }

  #getFlagLegacyReason(flag: FeatureFlags, orders: Order[]): PrintLegacyReason | null {
    return orders.reduce<PrintLegacyReason | null>(
      (reason: PrintLegacyReason | null, order: Order) => reason ?? this.#getPlanLegacyReason(flag, order),
      null,
    );
  }

  #getPlanLegacyReason(flag: FeatureFlags, order: Order): PrintLegacyReason | null {
    if (order.planId === undefined) {
      return PrintLegacyReason.plan_not_resolved;
    }
    const isEnabled: boolean | null = this.#optimizelyService.isFeatureEnabled(flag, { plan_id: order.planId.toString() });
    if (isEnabled === null) {
      return PrintLegacyReason.flag_not_initialised;
    }

    return isEnabled ? null : PrintLegacyReason.flag_disabled;
  }

  #getDeviceFlag(printerFlag: PrintRouteFlag): FeatureFlags | undefined {
    if (typeof printerFlag === 'string') {
      return printerFlag;
    }
    const deviceHardwareType: PrintDeviceHardwareType | null = toPrintDeviceHardwareType(this.#deviceService.getFeverzoneDeviceType());

    return deviceHardwareType === null ? undefined : printerFlag[deviceHardwareType];
  }
}
