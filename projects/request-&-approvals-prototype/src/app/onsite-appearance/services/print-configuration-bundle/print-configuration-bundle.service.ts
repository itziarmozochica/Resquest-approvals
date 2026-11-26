import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  PrintConfiguration,
  PrintConfigurationBundle,
  PrintConfigurationBundleDTO,
  PrintConfigurationBundleInput,
  PrintConfigurationBundleInputDTO,
  PrintConfigurationDTO,
  PrintConfigurationInput,
  PrintConfigurationInputDTO,
  PrintConfigurationTicketPayload,
  PrintConfigurationTicketPayloadDTO,
} from '../../models/print-configuration-bundle.model';

@Injectable({
  providedIn: 'root',
})
export class PrintConfigurationBundleService {
  #http = inject(HttpClient);
  #partnerService = inject(PartnerService);

  getAll(): Observable<PrintConfigurationBundle[]> {
    return this.#http.get<{ data: PrintConfigurationBundleDTO[]; error: null }>(this.#buildUrl()).pipe(
      map(response => response.data.map(dto => this.#mapFromApi(dto))),
      catchError(err => throwError(() => ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  getById(bundleId: string): Observable<PrintConfigurationBundle> {
    return this.#http.get<{ data: PrintConfigurationBundleDTO; error: null }>(this.#buildUrlById(bundleId)).pipe(
      map(response => this.#mapFromApi(response.data)),
      catchError(err => throwError(() => ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  create(payload: PrintConfigurationBundleInput): Observable<PrintConfigurationBundle> {
    return this.#http.post<{ data: PrintConfigurationBundleDTO; error: null }>(this.#buildUrl(), this.#mapToApi(payload)).pipe(
      map(response => this.#mapFromApi(response.data)),
      catchError(err => throwError(() => ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  update(bundleId: string, payload: PrintConfigurationBundleInput): Observable<PrintConfigurationBundle> {
    return this.#http.put<{ data: PrintConfigurationBundleDTO; error: null }>(this.#buildUrlById(bundleId), this.#mapToApi(payload)).pipe(
      map(response => this.#mapFromApi(response.data)),
      catchError(err => throwError(() => ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  delete(bundleId: string): Observable<void> {
    return this.#http
      .delete<void>(this.#buildUrlById(bundleId))
      .pipe(catchError(err => throwError(() => ErrorResponseUtils.getErrorResponseError(err))));
  }

  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.#http.post<{ data: { image_url: string }; error: null }>(`${this.#buildUrl()}/images`, formData).pipe(
      map(response => response.data.image_url),
      catchError(err => throwError(() => ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  #buildUrl(): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${this.#partnerService.getPartner()?.id}/print-configuration-bundles`;
  }

  #buildUrlById(bundleId: string): string {
    return `${this.#buildUrl()}/${bundleId}`;
  }

  #mapFromApi(dto: PrintConfigurationBundleDTO): PrintConfigurationBundle {
    return {
      id: dto.id,
      partnerId: dto.partner_id,
      name: dto.name,
      printConfigurations: dto.print_configurations.map(c => this.#mapConfigurationFromApi(c)),
    };
  }

  #mapConfigurationFromApi(dto: PrintConfigurationDTO): PrintConfiguration {
    return {
      id: dto.id,
      name: dto.name,
      documentType: dto.document_type,
      printerType: dto.printer_type,
      printTemplateLayoutId: dto.print_template_layout_id,
      ...(dto.ticket !== undefined && { ticket: this.#mapTicketPayloadFromApi(dto.ticket) }),
    };
  }

  #mapTicketPayloadFromApi(dto: PrintConfigurationTicketPayloadDTO): PrintConfigurationTicketPayload {
    return {
      partnerLogoUrl: dto.partner_logo_url,
      venueName: dto.venue_name,
      venueNameText: dto.venue_name_text,
      address: dto.address,
      dateAndStartTime: dto.date_and_start_time,
      openGates: dto.open_gates,
      price: dto.price,
      surchargeBreakdown: dto.surcharge_breakdown,
      codeTextBelowQr: dto.code_text_below_qr,
      seatingInfo: dto.seating_info,
      nominative: dto.nominative,
      partnerTaxInfo: dto.partner_tax_info,
      partnerTaxInfoText: dto.partner_tax_info_text,
      disclaimerAndTerms: dto.disclaimer_and_terms,
      disclaimerAndTermsText: dto.disclaimer_and_terms_text,
      poweredByFever: dto.powered_by_fever,
    };
  }

  #mapToApi(input: PrintConfigurationBundleInput): PrintConfigurationBundleInputDTO {
    return {
      name: input.name,
      print_configurations: input.printConfigurations.map(c => this.#mapConfigurationToApi(c)),
    };
  }

  #mapConfigurationToApi(input: PrintConfigurationInput): PrintConfigurationInputDTO {
    return {
      name: input.name,
      document_type: input.documentType,
      printer_type: input.printerType,
      print_template_layout_id: input.printTemplateLayoutId,
      ...(input.ticket !== undefined && { ticket: this.#mapTicketPayloadToApi(input.ticket) }),
    };
  }

  #mapTicketPayloadToApi(input: PrintConfigurationTicketPayload): PrintConfigurationTicketPayloadDTO {
    return {
      partner_logo_url: input.partnerLogoUrl,
      venue_name: input.venueName,
      venue_name_text: input.venueNameText,
      address: input.address,
      date_and_start_time: input.dateAndStartTime,
      open_gates: input.openGates,
      price: input.price,
      surcharge_breakdown: input.surchargeBreakdown,
      code_text_below_qr: input.codeTextBelowQr,
      seating_info: input.seatingInfo,
      nominative: input.nominative,
      partner_tax_info: input.partnerTaxInfo,
      partner_tax_info_text: input.partnerTaxInfoText,
      disclaimer_and_terms: input.disclaimerAndTerms,
      disclaimer_and_terms_text: input.disclaimerAndTermsText,
      powered_by_fever: input.poweredByFever,
    };
  }
}
