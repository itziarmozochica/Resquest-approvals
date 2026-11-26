import { SourceListen } from '../../../../shared/services/webview-messenger/webview-messenger.service';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface KioskPrinterStatusData {
  device: string;
  status: string;
  source: SourceListen;
}

export class KioskPrinterStatusEvent extends TrackingEvent<KioskPrinterStatusData> {
  constructor(readonly data: KioskPrinterStatusData) {
    super(TrackingEvents.KioskPrinterStatus, data);
  }
}
