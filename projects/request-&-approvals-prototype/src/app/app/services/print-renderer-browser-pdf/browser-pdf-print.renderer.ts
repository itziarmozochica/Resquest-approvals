import { inject, Injectable } from '@angular/core';

import { PrintDocumentRendererService } from '@fz-original/app/shared/services/ticket-pdf-generator/print-document-renderer.service';
import moment from 'moment-timezone';
import { map, Observable } from 'rxjs';

import { PrintablePdfRepresentation, PrintRepresentationType } from '../print-adapter/models/print-adapter.model';
import { PrintRenderer } from '../print-renderer/print.renderer';
import { PrintableObject, PrintCommand } from '../print-v2/models/print-command.model';

@Injectable({
  providedIn: 'root',
})
export class BrowserPdfPrintRenderer implements PrintRenderer {
  readonly #printDocumentRendererService = inject(PrintDocumentRendererService);

  render$(command: PrintCommand, printable: PrintableObject): Observable<PrintablePdfRepresentation> {
    return this.#printDocumentRendererService.getPdf$(command, printable).pipe(
      map(
        (pdf: Blob): PrintablePdfRepresentation => ({
          fileName: `tickets_${moment().format('YYYY-MM-DD')}_${printable.order.id}.pdf`,
          pdf,
          type: PrintRepresentationType.pdf,
        }),
      ),
    );
  }
}
