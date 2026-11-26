import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { centerTagToRichTextHtml } from '../../../shared/components/rich-text-editor/rich-text-editor-content.utils';
import { BaseResponse } from '../../../shared/models/base-response';
import { CityData } from '../../../shared/models/plan/city.model';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import { CitySearchResponse } from '../models/city-search-response.model';
import { PlanCategory, PlanType } from '../models/general-section.enum';
import { MainPlanSettings } from '../models/main-plan-settings.model';
import { RequestGeneralReview } from '../models/post-purchase-section.enum';
import { SelectorSettingType, SessionSelectorType } from '../models/selector-session-section.enum';
import { TransportConfiguration } from '../models/transport-configuration.model';
import { ValidationMethod, ValidationWindow } from '../models/validation-section.enum';
import { MainPlanSettingsDto, MainPlanSettingsSettingsDto, TransportConfigurationDto } from './dtos/main-plan-settings.dto';

export interface Contract {
  id: string;
  name: string;
}

interface ContractsResponse {
  contracts: Contract[];
}

@Injectable({
  providedIn: 'root',
})
export class MainPlanSettingsService {
  #http: HttpClient = inject(HttpClient);

  getCitiesByIds(partnerId: number, cityIds: number[]): Observable<CityData[]> {
    if (cityIds.length === 0) {
      return throwError(() => new Error('At least one city ID must be provided'));
    }

    const url = this.#getCitiesSearchUrl(partnerId);
    let params = new HttpParams({
      fromObject: {
        page: '1',
        page_size: cityIds.length.toString(),
      },
    });

    cityIds.forEach(cityId => {
      params = params.append('city_ids', cityId.toString());
    });

    return this.#http.get<BaseResponse<CitySearchResponse>>(url, { params }).pipe(
      map(response => response.data?.cities || []),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getContracts(partnerId: number, mainPlanId: number): Observable<Contract[]> {
    const url = this.#getContractsUrl(partnerId);
    const params = new HttpParams().set('plan_id', mainPlanId.toString());

    return this.#http.get<BaseResponse<ContractsResponse>>(url, { params }).pipe(
      map(response => response.data?.contracts || []),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getMainPlanGeneralSettings(partnerId: number, planId: number): Observable<Partial<MainPlanSettings>> {
    const path = this.#getMainPlanGeneralSettingsUrl(partnerId, planId);

    return this.#http.get<BaseResponse<MainPlanSettingsDto>>(path, { observe: 'response' }).pipe(
      map((result: HttpResponse<BaseResponse<MainPlanSettingsDto>>) => this.#mapFromApi(result)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  searchCities(partnerId: number, searchTerm: string, page: number = 1, pageSize: number = 10): Observable<CityData[]> {
    const url = this.#getCitiesSearchUrl(partnerId);
    const params = new HttpParams({
      fromObject: {
        page: page.toString(),
        page_size: pageSize.toString(),
        search_term: searchTerm,
      },
    });

    return this.#http.get<BaseResponse<CitySearchResponse>>(url, { params }).pipe(
      map(response => response.data?.cities || []),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  updateMainPlanGeneralSettings(partnerId: number, planId: number, settings: Partial<MainPlanSettings>): Observable<void> {
    const path = this.#getMainPlanGeneralSettingsUrl(partnerId, planId);
    const dto = this.#mapToApi(settings);

    return this.#http.patch<BaseResponse<void>>(path, dto).pipe(
      map((): undefined => void 0),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  #getCitiesSearchUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/cities/`;
  }

  #getContractsUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/contracts/`;
  }

  #getMainPlanGeneralSettingsUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/settings/`;
  }

  #mapFromApi(response: HttpResponse<BaseResponse<MainPlanSettingsDto>>): Partial<MainPlanSettings> {
    if (!response.body) {
      throw new Error('No response body');
    }

    const { data, error } = response.body;
    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No data in response');
    }

    const settings = data.settings;

    let requestGeneralReview: RequestGeneralReview | undefined;
    if (settings.request_general_review !== undefined) {
      if (settings.request_general_review === null) {
        requestGeneralReview = RequestGeneralReview.OnlyValidated;
      } else if (settings.request_general_review === true) {
        requestGeneralReview = RequestGeneralReview.Yes;
      } else {
        requestGeneralReview = RequestGeneralReview.No;
      }
    }

    const result: Partial<MainPlanSettings> = {
      allowLoyaltyRedemption: settings.allow_loyalty_redemption,
      allowTicketCancellations: settings.allow_ticket_cancellations,
      baseLocale: settings.base_locale,
      calendarSelector: settings.calendar_selector,
      category: (typeof settings.category === 'object' ? settings.category.current_value : settings.category) as PlanCategory,
      categoryAllowedValues: typeof settings.category === 'object' ? settings.category.allowed_values : undefined,
      cities: settings.cities,
      continuousTimeSelector: settings.continuous_time_selector,
      contracts: Array.isArray(settings.contracts)
        ? settings.contracts.map((contract: string | { id: string; name: string }) =>
            typeof contract === 'string' ? contract : contract.id,
          )
        : settings.contracts,
      denyPublishingInOta: settings.deny_publishing_in_ota,
      disallowIndexing: settings.disallow_indexing,
      hasPriceListPricing: settings.has_price_list_pricing,
      hideCouponLoyalty: settings.hide_coupon_loyalty,
      hideHelp: settings.hide_help,
      hoursBeforeSessionCancellationNotAllowed: settings.hours_before_session_cancellation_not_allowed,
      labelFormat: settings.label_format,
      maxFeverCreditAllowed: settings.max_fever_credit_allowed,
      mustUseTaxBase: settings.must_use_tax_base,
      overrideCapacityLimit: settings.override_capacity_limit,
      partnershipType: typeof settings.partnership_type === 'object' ? settings.partnership_type.current_value : settings.partnership_type,
      partnershipTypeAllowedValues: typeof settings.partnership_type === 'object' ? settings.partnership_type.allowed_values : undefined,
      permissions: data.permissions,
      redirectToId: settings.redirect_to_id,
      required3ds: settings.required_3ds,
      allowInvitationReselling: settings.allow_invitation_reselling,
      resellingProviders: settings.reselling_providers ?? [],
      selectorSettingType: (typeof settings.selector_setting_type === 'object'
        ? settings.selector_setting_type.current_value
        : settings.selector_setting_type) as SelectorSettingType,
      selectorSettingTypeAllowedValues:
        typeof settings.selector_setting_type === 'object' ? settings.selector_setting_type.allowed_values : undefined,
      sessionSelectorType: (typeof settings.session_selector_type === 'object'
        ? settings.session_selector_type.current_value
        : settings.session_selector_type) as SessionSelectorType,
      sessionSelectorTypeAllowedValues:
        typeof settings.session_selector_type === 'object' ? settings.session_selector_type.allowed_values : undefined,
      shouldChargeBookingFeesOnExchange: settings.should_charge_booking_fees_on_exchange,
      showImportantInformation: settings.show_important_information,
      transportConfiguration: settings.transport_configuration
        ? this.#mapTransportConfigurationFromApi(settings.transport_configuration)
        : undefined,
      type: (typeof settings.type === 'object' ? settings.type.current_value : settings.type) as PlanType,
      typeAllowedValues: typeof settings.type === 'object' ? settings.type.allowed_values : undefined,
      validationMethod: (typeof settings.validation_method === 'object' && settings.validation_method !== null
        ? settings.validation_method.current_value
        : settings.validation_method) as ValidationMethod,
      validationMethodAllowedValues:
        typeof settings.validation_method === 'object' && settings.validation_method !== null
          ? settings.validation_method.allowed_values
          : undefined,
      validationWindow: settings.can_validate_method !== undefined ? (Number(settings.can_validate_method) as ValidationWindow) : undefined,
    };

    if (settings.request_general_review !== undefined) {
      result.requestGeneralReview = requestGeneralReview;
    }

    if (settings.required_purchase_terms !== undefined) {
      result.requiredPurchaseTerms = centerTagToRichTextHtml(settings.required_purchase_terms ?? '', 'div');
    }

    return result;
  }

  #mapToApi(settings: Partial<MainPlanSettings>): Partial<MainPlanSettingsSettingsDto> {
    const dto: Partial<MainPlanSettingsSettingsDto> = {};

    if (settings.cities !== undefined) {
      dto.cities = settings.cities;
    }
    if (settings.contracts !== undefined) {
      dto.contracts = settings.contracts;
    }
    if (settings.calendarSelector !== undefined) {
      dto.calendar_selector = settings.calendarSelector;
    }
    if (settings.continuousTimeSelector !== undefined) {
      dto.continuous_time_selector = settings.continuousTimeSelector;
    }
    if (settings.denyPublishingInOta !== undefined) {
      dto.deny_publishing_in_ota = settings.denyPublishingInOta;
    }
    if (settings.disallowIndexing !== undefined) {
      dto.disallow_indexing = settings.disallowIndexing;
    }
    if (settings.hasPriceListPricing !== undefined) {
      dto.has_price_list_pricing = settings.hasPriceListPricing;
    }
    if (settings.labelFormat !== undefined) {
      dto.label_format = settings.labelFormat;
    }
    if (settings.mustUseTaxBase !== undefined) {
      dto.must_use_tax_base = settings.mustUseTaxBase;
    }
    if (settings.requestGeneralReview !== undefined) {
      if (settings.requestGeneralReview === RequestGeneralReview.OnlyValidated) {
        dto.request_general_review = null;
      } else if (settings.requestGeneralReview === RequestGeneralReview.Yes) {
        dto.request_general_review = true;
      } else if (settings.requestGeneralReview === RequestGeneralReview.No) {
        dto.request_general_review = false;
      }
    }
    if (settings.selectorSettingType !== undefined) {
      dto.selector_setting_type = settings.selectorSettingType;
    }
    if (settings.sessionSelectorType !== undefined) {
      dto.session_selector_type = settings.sessionSelectorType;
    }
    if (settings.validationMethod !== undefined) {
      dto.validation_method = settings.validationMethod;
    }
    if (settings.validationWindow !== undefined) {
      dto.can_validate_method = settings.validationWindow;
    }
    if (settings.type !== undefined) {
      dto.type = settings.type;
    }
    if (settings.category !== undefined) {
      dto.category = settings.category;
    }
    if (settings.partnershipType !== undefined) {
      dto.partnership_type = settings.partnershipType;
    }
    if (settings.overrideCapacityLimit !== undefined) {
      dto.override_capacity_limit = settings.overrideCapacityLimit;
    }
    if (settings.requiredPurchaseTerms !== undefined) {
      dto.required_purchase_terms = settings.requiredPurchaseTerms;
    }
    if (settings.transportConfiguration !== undefined) {
      dto.transport_configuration = this.#mapTransportConfigurationToApi(settings.transportConfiguration);
    }

    if (settings.resellingProviders !== undefined) {
      dto.reselling_providers = settings.resellingProviders;
    }
    if (settings.allowInvitationReselling !== undefined) {
      dto.allow_invitation_reselling = settings.allowInvitationReselling;
    }
    if (settings.allowTicketCancellations !== undefined) {
      dto.allow_ticket_cancellations = settings.allowTicketCancellations;
    }
    if (settings.hoursBeforeSessionCancellationNotAllowed !== undefined) {
      dto.hours_before_session_cancellation_not_allowed = settings.hoursBeforeSessionCancellationNotAllowed;
    }

    return dto;
  }

  #mapTransportConfigurationFromApi(dto: TransportConfigurationDto): TransportConfiguration {
    return {
      externalEventId: dto.external_event_id ?? null,
      isEnabled: dto.is_enabled,
      transportProviderId: dto.transport_provider_id ?? null,
    };
  }

  #mapTransportConfigurationToApi(config: TransportConfiguration): TransportConfigurationDto {
    if (!config.isEnabled) {
      return {
        is_enabled: false,
      };
    }

    return {
      external_event_id: config.externalEventId,
      is_enabled: config.isEnabled,
      transport_provider_id: config.transportProviderId,
    };
  }
}
