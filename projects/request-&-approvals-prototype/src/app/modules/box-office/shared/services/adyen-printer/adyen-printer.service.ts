import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PrintStatus, PrintStatusEnum } from '@fz-original/app/modules/box-office/shared/services/adyen-printer/models/print-status.model';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../../environments/environment';
import { BaseResponse } from '../../../../../shared/models/base-response';
import { Channel } from '../../../../../shared/services/session-availability/channel.enum';
import { ErrorResponseUtils } from '../../../../../shared/utils/error-response.utils';
import {
  FiscalTag,
  PrinterDocumentType,
  PrinterInstructionsRequest,
} from '../../../../kiosk/services/printer/models/printer-instruction.model';
import { OnsiteDeviceType } from '../../models/onsite-device-type.enum';
import { OnsiteSetupsStorageService } from '../onsite-setups/onsite-setups-storage.service';
import { AdyenPrinterNotAcceptableConditionsError } from './errors/adyen-printer-not-acceptable-conditions.error';
import { AdyenPrinterRejectedError } from './errors/adyen-printer-rejected.error';
import { AdyenPrinterTimeoutError } from './errors/adyen-printer-timeout.error';

export const RETRY_TIME_IN_MS = 1000;

@Injectable({
  providedIn: 'root',
})
export class AdyenPrinterService {
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);

  private readonly retryTimeInMs = RETRY_TIME_IN_MS;

  constructor(private httpClient: HttpClient) {}

  printAdyen(
    partnerId: number,
    planId: number,
    placeId: number,
    orderId: number,
    deviceId: string,
    documentType: PrinterDocumentType,
    atIndex?: number,
    isUnifyTicket: boolean = false,
    codeIds?: number[],
    channelId?: string,
    fiscalNumber?: string,
    fiscalTags?: FiscalTag[],
  ): Observable<BaseResponse<PrintStatus> | null> {
    return this.requestPrintAdyen(
      partnerId,
      planId,
      placeId,
      orderId,
      deviceId,
      documentType,
      atIndex,
      isUnifyTicket,
      codeIds,
      channelId,
      fiscalNumber,
      fiscalTags,
    ).pipe(
      switchMap((result: BaseResponse<PrintStatus>) => {
        if (result.data?.status == PrintStatusEnum.InProgress) {
          return of(null).pipe(
            delay(this.retryTimeInMs),
            switchMap(() =>
              this.printAdyen(
                partnerId,
                planId,
                placeId,
                orderId,
                deviceId,
                documentType,
                result.data!.atIndex,
                isUnifyTicket,
                codeIds,
                channelId,
                fiscalNumber,
                fiscalTags,
              ),
            ),
          );
        }

        return of(result);
      }),
    );
  }

  private requestPrintAdyen(
    partnerId: number,
    planId: number,
    placeId: number,
    orderId: number,
    deviceId: string,
    documentType: PrinterDocumentType,
    atIndex?: number,
    isUnifyTicket?: boolean,
    codeIds?: number[],
    channelId?: string,
    fiscalNumber?: string,
    fiscalTags?: FiscalTag[],
  ): Observable<BaseResponse<PrintStatus>> {
    const url: string = this.printAdyenUrl(partnerId, planId, placeId, orderId);
    const body: PrinterInstructionsRequest = {
      document_type: documentType,
      device_id: deviceId,
      unify_ticket: isUnifyTicket,
    };
    if (atIndex) {
      body['at_index'] = atIndex;
    }
    if (codeIds && codeIds.length > 0) {
      body['code_ids'] = codeIds;
    }
    body['channel_id'] = channelId ?? this.#resolveChannelFromDeviceType();
    if (fiscalNumber) {
      body.fiscal_number = fiscalNumber;
    }
    if (fiscalTags && fiscalTags.length > 0) {
      body.fiscal_tags = fiscalTags;
    }

    return this.httpClient.post<unknown>(url, body).pipe(
      map(() => {
        return new BaseResponse({ status: PrintStatusEnum.Completed }, null);
      }),
      catchError(error => {
        return this.keepPolling(error)
          ? of(new BaseResponse({ status: PrintStatusEnum.InProgress, atIndex: error.error.error.at_index }, null))
          : this.handleError(error);
      }),
    );
  }

  private keepPolling(error: HttpErrorResponse): boolean {
    return error.status === 408 && error.error.error.code === 1001;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    if (error.status === 408 && error.error.error.code === 1002) {
      throw new AdyenPrinterTimeoutError(error.error.error.at_index);
    } else if (error.status === 428 && error.error.error.code === 1003) {
      throw new AdyenPrinterNotAcceptableConditionsError(error.error.error.at_index);
    } else if (error.status === 406 && error.error.error.code === 1004) {
      throw new AdyenPrinterRejectedError(error.error.error.at_index);
    } else {
      return throwError(ErrorResponseUtils.getErrorResponseFromGroup(error, 'adyen'));
    }
  }

  #resolveChannelFromDeviceType(): string {
    const onsiteSetup = this.#onsiteSetupsStorageService.getConfiguration();
    const deviceType = onsiteSetup?.device_type;
    if (deviceType === OnsiteDeviceType.KIOSK) {
      return Channel.Kiosk;
    }

    return onsiteSetup?.channel_id ?? Channel.BoxOffice;
  }

  private printAdyenUrl(partnerId: number, planId: number, placeId: number, orderId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/places/${placeId}/orders/${orderId}/adyen-printer`;
  }
}
