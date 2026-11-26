import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { redactValidationErrorValues } from '../../../core/error/redact-validation-error-values.util';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { CustomerType } from '../../models/customer/customer-type.enum';
import { Customer, CustomerApiPayload } from '../../models/customer/customer.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { CustomerAdapter } from './customer.adapter';

export function hasContactDetails(customer: Customer | undefined): boolean {
  return Boolean(customer?.email) || Boolean(customer?.phoneNumber);
}

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  #adapter: CustomerAdapter = inject(CustomerAdapter);
  #httpClient: HttpClient = inject(HttpClient);

  create(partnerId: number, customer: Customer, channel?: string): Observable<BaseResponse<Customer>> {
    if (!hasContactDetails(customer)) {
      return of(new BaseResponse({ id: this.#getGenericUserId(), type: CustomerType.ANONYMOUS }, null));
    }
    const path = this.#getCreateUrl(partnerId);
    const body: CustomerApiPayload = this.#getCreateCustomerBody(customer, channel);
    return this.#httpClient.post(path, body).pipe(
      switchMap(result => {
        const response = this.#adapter.fromApi(result);
        if (response && response.data) {
          response.data.email = customer.email;
          response.data.firstName = customer.firstName;
          response.data.lastName = customer.lastName;
          response.data.phoneNumber = customer.phoneNumber;
          response.data.acceptedTerms = customer.acceptedTerms;
          response.data.cityStandardId = customer.cityStandardId;
          response.data.type = customer.type;
        }
        return of(response);
      }),
      catchError(error => {
        const pydanticMessageKey = this.#getPydanticValidationMessageKey(error);
        const redactedError = this.#getRedactedError(error);
        if (pydanticMessageKey !== null) {
          const code: number = typeof error?.status === 'number' ? error.status : 422;
          return of(new BaseResponse<Customer>(null, { code, message: pydanticMessageKey, error: redactedError }));
        }
        const errorResponse = redactedError as BaseErrorResponse; // getErrorResponse reads HttpErrorResponse fields, not BaseErrorResponse
        return ErrorResponseUtils.getErrorResponse<Customer>(errorResponse) as unknown as Observable<BaseResponse<Customer>>;
      }),
    );
  }

  #getCreateCustomerBody(customer: Customer, channel?: string): CustomerApiPayload {
    const parameters: CustomerApiPayload = {
      first_name: customer.firstName,
      last_name: customer.lastName,
      city: customer.cityStandardId,
      terms: customer.acceptedTerms,
    };

    if (customer.email) {
      parameters.email = customer.email;
    }

    if (customer.phoneNumber) {
      parameters.phone_number = customer.phoneNumber;
    }

    if (channel) {
      parameters.channel_id = channel;
    }

    return parameters;
  }

  #getCreateUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/users`;
  }

  #getGenericUserId(): number {
    return environment.OBO.GENERIC_USER_ID;
  }

  #getPydanticValidationMessageKey(error: unknown): string | null {
    const details = this.#getPydanticValidationDetails(error);
    if (!Array.isArray(details) || details.length === 0) {
      return null;
    }

    return details.some((detail: unknown) => this.#isEmailValidationError(detail)) ? 'form.error.invalidEmail' : null;
  }

  #getPydanticValidationDetails(error: unknown): unknown {
    if (typeof error !== 'object' || error === null || !('error' in error)) {
      return null;
    }

    const responseError = error.error;
    if (typeof responseError !== 'object' || responseError === null || !('detail' in responseError)) {
      return null;
    }

    return responseError.detail;
  }

  #getRedactedError(error: unknown): unknown {
    if (!(error instanceof HttpErrorResponse)) {
      return redactValidationErrorValues(error);
    }

    return new HttpErrorResponse({
      error: redactValidationErrorValues(error.error),
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url ?? undefined,
    });
  }

  #isEmailValidationError(detail: unknown): boolean {
    if (typeof detail !== 'object' || detail === null || !('loc' in detail) || !('msg' in detail)) {
      return false;
    }

    return Array.isArray(detail.loc) && detail.loc.some((segment: unknown) => segment === 'email');
  }
}
