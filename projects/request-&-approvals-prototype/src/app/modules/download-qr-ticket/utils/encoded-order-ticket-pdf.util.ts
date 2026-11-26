import { printCommandMaxCodeIdsPerPrintable } from '@fz-original/app/app/services/print-v2/models/print-command.model';
import { environment } from '@fz-original/environments/environment';

import { EncodedOrderTicketPdfRequest } from '../models/download-qr-ticket.model';

export function buildEncodedOrderTicketPdfUrl(request: EncodedOrderTicketPdfRequest): string {
  const params = new URLSearchParams({ data: request.data });
  if (request.onsiteSetupId !== null) {
    params.set('onsite_setup_id', request.onsiteSetupId);
  }
  if (request.codeIds.length > 0) {
    params.set('code_ids_csv', request.codeIds.join(','));
  }
  return `${environment.apiGWBaseUrl}/1.0/partners/${request.partnerId}/encoded-orders/rendered-print-documents?${params.toString()}`;
}

export function chunkCodeIds(codeIds: string[]): string[][] {
  if (codeIds.length <= printCommandMaxCodeIdsPerPrintable) {
    return [codeIds];
  }
  const batchCount: number = Math.ceil(codeIds.length / printCommandMaxCodeIdsPerPrintable);
  return Array.from({ length: batchCount }, (element: undefined, index: number) =>
    codeIds.slice(index * printCommandMaxCodeIdsPerPrintable, (index + 1) * printCommandMaxCodeIdsPerPrintable),
  );
}
