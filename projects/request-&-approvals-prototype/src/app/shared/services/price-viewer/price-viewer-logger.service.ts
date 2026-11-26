import { Injectable } from '@angular/core';

import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';

@Injectable({
  providedIn: 'root',
})
export class PriceViewerLoggerService {
  constructor(private datadogLogService: DatadogLogService) {}

  warn(message: string): void {
    this.datadogLogService.logWarn(`[PriceViewer] ${message}`);
  }

  info(message: string): void {
    this.datadogLogService.logInfo(`[PriceViewer] ${message}`);
  }
}
