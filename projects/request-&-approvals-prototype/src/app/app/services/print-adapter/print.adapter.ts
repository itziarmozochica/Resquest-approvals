import { Observable } from 'rxjs';

import { PrintConfigurationBlockedReason } from '../print-v2/models/print-block.model';
import { PrintCommand, PrinterSpecificConfig } from '../print-v2/models/print-command.model';
import { RenderedPrintable } from './models/print-adapter.model';

export abstract class PrintAdapter {
  abstract print(documents: RenderedPrintable[], config: PrinterSpecificConfig): Observable<void>;

  abstract validate(command: PrintCommand): PrintConfigurationBlockedReason | null;
}
