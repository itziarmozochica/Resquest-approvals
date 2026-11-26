import { Observable } from 'rxjs';

import { PriceViewerStatus } from './models/price-viewer-status.model';
import { PriceViewerWriterResult } from './models/price-viewer-writer-result.model';

export abstract class PriceViewerPrinterService {
  abstract status(): Observable<PriceViewerStatus>;

  abstract lastStatus(): PriceViewerStatus;

  abstract print(label: string, total: string, currency: string): void;

  abstract connect(): Observable<PriceViewerStatus>;

  abstract clear(): void;
}
