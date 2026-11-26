import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { KioskPrinterCutConfiguration } from '../../../box-office/shared/models/kiosk-onsite-setup';
import { KioskStorageService } from '../kiosk-storage.service';
import {
  PrinterDocumentType,
  PrinterInstruction,
  PrinterInstructionsRequest,
  PrinterInstructionsResponse,
} from './models/printer-instruction.model';

@Injectable({
  providedIn: 'root',
})
export class PrinterService {
  readonly #http = inject(HttpClient);
  readonly #kioskStorageService = inject(KioskStorageService);

  generatePrinterInstructions(
    partnerId: number,
    planId: number,
    placeId: number,
    orderId: number,
    documentType: PrinterDocumentType,
    unifyTickets: boolean,
  ): Observable<BaseResponse<Array<PrinterInstruction>>> {
    const url: string = this.#getPrinterInstructionsUrl(partnerId, planId, placeId, orderId);
    const body = this.#getPrinterInstructionsBody(documentType, unifyTickets);
    return this.#http.post<PrinterInstructionsResponse>(url, body).pipe(
      map((response: PrinterInstructionsResponse) => new BaseResponse<Array<PrinterInstruction>>(response.data, null)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Array<PrinterInstruction>>(error)),
    ) as Observable<BaseResponse<Array<PrinterInstruction>>>;
  }

  #getPrinterInstructionsUrl(partnerId: number, planId: number, placeId: number, orderId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/places/${placeId}/orders/${orderId}/thermal-printer`;
  }

  #getPrinterInstructionsBody(documentType: PrinterDocumentType, unifyTicket: boolean): PrinterInstructionsRequest {
    const printerInstructionsRequest: PrinterInstructionsRequest = {
      document_type: documentType,
      unify_ticket: unifyTicket,
    };

    if (this.#kioskStorageService.getOnsiteSetup()) {
      printerInstructionsRequest.cut_paper_mode =
        this.#kioskStorageService.getOnsiteSetup()?.printer_cut_configuration == KioskPrinterCutConfiguration.FULL_CUT
          ? 0 // FULL CUT in backend
          : 1; // PARTIAL CUT
    }
    return printerInstructionsRequest;
  }

  generateErrorPaymentPrinterInstructions(
    partnerId: number,
    planId: number,
    placeId: number,
    cartId: string,
  ): Observable<BaseResponse<Array<PrinterInstruction>>> {
    const url: string = this.#getErrorPaymentPrinterInstructionsUrl(partnerId, planId, placeId, cartId);

    return this.#http.post<PrinterInstructionsResponse>(url, {}).pipe(
      map((response: PrinterInstructionsResponse) => new BaseResponse<Array<PrinterInstruction>>(response.data, null)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Array<PrinterInstruction>>(error)),
    ) as Observable<BaseResponse<Array<PrinterInstruction>>>;
  }

  #getErrorPaymentPrinterInstructionsUrl(partnerId: number, planId: number, placeId: number, cartId: string): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/places/${placeId}/carts/${cartId}/error/thermal-printer/`;
  }
}
