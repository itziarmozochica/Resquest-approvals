import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface DownloadCashRegisterReportData {
  report_id: string;
  report_status: string;
}

export class DownloadCashRegisterReportEvent extends TrackingEvent<DownloadCashRegisterReportData> {
  constructor(readonly data: DownloadCashRegisterReportData) {
    super(TrackingEvents.DownloadCashRegisterReport, data);
  }
}
