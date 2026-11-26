import { Observable } from 'rxjs';

import { PrintableRepresentation } from '../print-adapter/models/print-adapter.model';
import { PrintableObject, PrintCommand } from '../print-v2/models/print-command.model';

export interface PrintRenderer {
  render$(command: PrintCommand, printable: PrintableObject): Observable<PrintableRepresentation>;
}
