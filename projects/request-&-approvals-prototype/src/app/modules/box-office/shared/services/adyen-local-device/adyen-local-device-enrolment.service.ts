import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../../environments/environment';
import { BaseErrorResponse, BaseResponse } from '../../../../../shared/models/base-response';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../../shared/utils/error-response.utils';
import { AdyenLocalDeviceEnrolmentInput, AdyenLocalSealedKey } from '../../models/adyen-local-device';
import { AdyenLocalDeviceEnrolmentBodyDto, AdyenLocalSealedKeyDto } from '../../models/adyen-local-device-dto';
import { AdyenLocalConnectDeviceError, AdyenLocalConnectDeviceFailure } from './adyen-local-connect-device.error';

/** The validation codes B2BO-8465 answers 422 with, each landing on the field the operator owns. */
const ENROLMENT_ERROR_CODE_FAILURES: Record<string, AdyenLocalConnectDeviceFailure> = {
  terminal_external_id_invalid_format: 'terminal_external_id_invalid',
  terminal_ip_address_invalid_format: 'terminal_ip_invalid',
};

/** A gateway that does not route the enrolment path answers one of these, not a validation error. */
const ENDPOINT_MISSING_STATUSES: readonly number[] = [404, 405, 501];

/** The gateway segment of the terminal-pairing path. The backend routes the connect per gateway. */
const ADYEN_LOCAL_GATEWAY = 'adyen_local';

/**
 * The partners provisioning endpoint (B2BO-8465) behind one seam: it seals the venue's NEXO
 * passphrase to the device public key and records the enrolment, so it can only run against a
 * configuration that already exists (D17).
 *
 * An environment that does not route the path yet fails as `enrolment_endpoint_unavailable` and
 * the screen says so, rather than pretending a device was connected.
 */
@Injectable({
  providedIn: 'root',
})
export class AdyenLocalDeviceEnrolmentService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #http = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);

  connectDevice(configurationId: string, input: AdyenLocalDeviceEnrolmentInput): Observable<AdyenLocalSealedKey> {
    const body: AdyenLocalDeviceEnrolmentBodyDto = {
      device_public_key: input.devicePublicKey,
      ip_address: input.terminalIpAddress,
      payment_configuration_id: configurationId,
      device_serial_number: input.terminalExternalId,
    };
    return this.#http.post<BaseResponse<AdyenLocalSealedKeyDto | null>>(this.#getEnrolmentUrl(), body).pipe(
      map(response => this.#fromApi(response.data, configurationId)),
      catchError((error: unknown) => throwError(() => this.#toConnectDeviceError(error, configurationId))),
    );
  }

  #failureFor(errorResponse: BaseErrorResponse): AdyenLocalConnectDeviceFailure {
    const code = errorResponse.code;
    if (typeof code === 'string' && ENROLMENT_ERROR_CODE_FAILURES[code] !== undefined) {
      return ENROLMENT_ERROR_CODE_FAILURES[code];
    }
    if (typeof code === 'number' && ENDPOINT_MISSING_STATUSES.includes(code)) {
      return 'enrolment_endpoint_unavailable';
    }
    return 'enrolment_rejected';
  }

  #fromApi(dto: AdyenLocalSealedKeyDto | null, configurationId: string): AdyenLocalSealedKey {
    if (dto === null || dto === undefined) {
      this.#datadogLogService.logError('[AdyenLocalDeviceEnrolment] The enrolment response carried no sealed key', {
        payment_configuration_id: configurationId,
      });
      throw new AdyenLocalConnectDeviceError('enrolment_rejected');
    }
    return {
      ciphertext: dto.ciphertext,
      deviceSerialNumber: dto.device_serial_number,
      envelopeVersion: dto.envelope_version,
      iv: dto.iv,
      keyVersion: dto.key_version,
      wrappedKey: dto.wrapped_key,
    };
  }

  #getEnrolmentUrl(): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/terminal-pairing/${ADYEN_LOCAL_GATEWAY}`;
  }

  #toConnectDeviceError(error: unknown, configurationId: string): AdyenLocalConnectDeviceError {
    if (error instanceof AdyenLocalConnectDeviceError) {
      return error;
    }
    const errorResponse: BaseErrorResponse = ErrorResponseUtils.getErrorResponseError(error);
    const failure = this.#failureFor(errorResponse);
    this.#datadogLogService.logError('[AdyenLocalDeviceEnrolment] The enrolment request failed', {
      error_code: errorResponse.code,
      failure,
      payment_configuration_id: configurationId,
    });
    return new AdyenLocalConnectDeviceError(failure, errorResponse);
  }
}
