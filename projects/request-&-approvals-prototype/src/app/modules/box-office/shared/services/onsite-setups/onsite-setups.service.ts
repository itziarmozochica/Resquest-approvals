import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { CreateOnsiteSetupData } from '@fz-original/app/core/tracking/core/events/create-onsite-setup';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../../environments/environment';
import { SKIP_FORBIDDEN_TOAST } from '../../../../../shared/interceptors/skip-forbidden-toast.token';
import { BaseResponse } from '../../../../../shared/models/base-response';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { Channel } from '../../../../../shared/services/session-availability/channel.enum';
import { ErrorResponseUtils } from '../../../../../shared/utils/error-response.utils';
import { KioskOnsiteSetupBody, KioskPrinterCutConfiguration } from '../../models/kiosk-onsite-setup';
import { OnsiteDeviceType } from '../../models/onsite-device-type.enum';
import {
  ContactInformationFieldEnum,
  ContactInformationOrderableFieldEnum,
  ContactInformationRequirementEnum,
  CutterTypeEnum,
  HardwareTypeEnum,
  OboFlowTypeEnum,
  OboPrinterTypeEnum,
  OnsiteSetup,
  OnsiteSetupBody,
  OnsiteSetupBodyWithPaymentConfigurationAssignment,
  OnsiteSetupPaymentConfigurationAssignment,
  OnsiteSetupQuery,
  PaperTypeEnum,
  PriceViewerEnum,
  ReceiptPrinterType,
  SelectableOnsiteSetups,
  SessionAvailabilityCacheStrategyEnum,
  SessionAvailabilityPlanConfigDTO,
  ShiftStrategyEnum,
  TicketSelectorTypeEnum,
  TicketValidationTypeEnum,
} from '../../models/onsite-setup';
import { normalizeOnsiteSetupsSummary, OnsiteSetupsSummaryDTO } from '../../models/onsite-setups-summary.model';
import { OnsiteSetupsAdapter } from './onsite-setups.adapter';

export type GetOnsiteSetupsApiResponseBody = Pick<BaseResponse<Array<OnsiteSetup>>, 'data' | 'error'>;
export type GetOnsiteSetupsSummaryApiResponseBody = Pick<BaseResponse<OnsiteSetupsSummaryDTO>, 'data' | 'error'>;

@Injectable({
  providedIn: 'root',
})
export class OnsiteSetupsService {
  constructor(
    private http: HttpClient,
    private partnerService: PartnerService,
    private onsiteSetupsAdapter: OnsiteSetupsAdapter,
  ) {}

  createBoxOfficeOnsiteSetup(
    placeId: number,
    onsiteSetupName: string,
    cashRegisters: string[] = [],
    maxPurchasableDays: number,
    shiftStrategy?: ShiftStrategyEnum,
    oboFlowType?: OboFlowTypeEnum,
    paperType?: PaperTypeEnum,
    cutterType?: CutterTypeEnum,
    priceViewer?: PriceViewerEnum,
    showSoldOutSessions?: boolean,
    ticketValidation?: TicketValidationTypeEnum,
    printTicketsCombinedForPlans?: number[],
    shiftMaxHoursOpen?: number,
    oboPrinterType?: OboPrinterTypeEnum,
    prioritizedMainPlans?: number[],
    presetCouponCodes?: string[],
    retailSetupId?: string,
    warehouseId?: string,
    productsHolderPlanId?: number,
    validationProfiles?: string[],
    accessControlSetupId?: string,
    contactInformationRequirement?: ContactInformationRequirementEnum,
    contactInformationFields?: ContactInformationFieldEnum[],
    canOverrideCapacities?: boolean,
    receiptPrinterType?: ReceiptPrinterType,
    channelId?: string,
    printConfigurationBundleId?: string | null,
    paymentConfigurationAssignment?: OnsiteSetupPaymentConfigurationAssignment,
    sessionAvailabilityCacheStrategy?: SessionAvailabilityCacheStrategyEnum,
    sessionAvailabilityCacheTimeoutInSeconds?: number,
    sessionAvailabilityPlanConfigs?: SessionAvailabilityPlanConfigDTO[],
    isHidden?: boolean,
    hardwareType?: HardwareTypeEnum,
    ticketSelectorType?: TicketSelectorTypeEnum,
    contactInformationFieldsOrder?: ContactInformationOrderableFieldEnum[],
  ): Observable<string> {
    const body = this.getBoxOfficeOnsiteSetupBody(
      onsiteSetupName,
      cashRegisters,
      maxPurchasableDays,
      shiftStrategy,
      oboFlowType,
      paperType,
      cutterType,
      priceViewer,
      showSoldOutSessions,
      ticketValidation,
      printTicketsCombinedForPlans,
      shiftMaxHoursOpen,
      OnsiteDeviceType.BOX_OFFICE,
      oboPrinterType,
      prioritizedMainPlans,
      presetCouponCodes,
      retailSetupId,
      warehouseId,
      productsHolderPlanId,
      validationProfiles,
      accessControlSetupId,
      contactInformationRequirement,
      contactInformationFields,
      canOverrideCapacities,
      receiptPrinterType,
      channelId,
      printConfigurationBundleId,
      sessionAvailabilityCacheStrategy,
      sessionAvailabilityCacheTimeoutInSeconds,
      sessionAvailabilityPlanConfigs,
      isHidden,
      hardwareType,
      ticketSelectorType,
      contactInformationFieldsOrder,
    );
    const bodyToSend: OnsiteSetupBody | OnsiteSetupBodyWithPaymentConfigurationAssignment =
      paymentConfigurationAssignment !== undefined
        ? this.withPaymentConfigurationAssignmentForCreate(body, paymentConfigurationAssignment)
        : body;
    return this.http.post<BaseResponse<CreateOnsiteSetupData>>(this.getOnsiteSetupUrlByPlace(placeId), bodyToSend).pipe(
      map((response: BaseResponse<CreateOnsiteSetupData>) => response.data?.onsite_setup_id as string),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  createDefaultOnsiteSetup(placeId: number): Observable<OnsiteSetup> {
    return this.http.post<BaseResponse<CreateOnsiteSetupData>>(this.getCreateDefaultOnsiteSetupUrl(placeId), {}).pipe(
      map((response: BaseResponse<CreateOnsiteSetupData>) => response.data?.onsite_setup_id as string),
      switchMap((onsite_setup_id: string) => this.getOnsiteSetupByPlace(placeId, onsite_setup_id)),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  createKioskOnsiteSetup(
    placeId: number,
    name: string,
    maxPurchasableDays: number,
    printTicketsCombined: boolean,
    showManageBooking: boolean,
    printerCutConfiguration: KioskPrinterCutConfiguration,
    paymentMethods: string[],
    paymentGateway: PaymentCheckoutET,
    paymentExtraInformation: string,
    availableLanguages: string[],
    contactInformationRequirement: ContactInformationRequirementEnum,
    contactInformationFields: ContactInformationFieldEnum[],
    squareLocationId?: string,
    squareApplicationId?: string,
    contactInformationFieldsOrder?: ContactInformationOrderableFieldEnum[],
  ): Observable<string> {
    const body = {
      ...this.getKioskOnsiteSetupBody(
        name,
        maxPurchasableDays,
        printTicketsCombined,
        showManageBooking,
        printerCutConfiguration,
        paymentMethods,
        paymentGateway,
        paymentExtraInformation,
        availableLanguages,
        contactInformationRequirement,
        contactInformationFields,
        squareLocationId,
        squareApplicationId,
        contactInformationFieldsOrder,
      ),
      device_type: OnsiteDeviceType.KIOSK,
    };
    return this.http.post<BaseResponse<CreateOnsiteSetupData>>(this.getOnsiteSetupUrlByPlace(placeId), body).pipe(
      map((response: BaseResponse<CreateOnsiteSetupData>) => response.data?.onsite_setup_id as string),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  deleteOnsiteSetup(placeId: number, onsiteSetupId: string): Observable<any> {
    return this.http.delete(this.getOnsiteSetupUrlByPlace(placeId, onsiteSetupId)).pipe(
      map(response => response),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  duplicateOnsiteSetup(placeId: number, onsiteSetupId: string): Observable<string> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${this.getPartnerId()}/places/${placeId}/onsite-setups/${onsiteSetupId}/duplicate`;
    return this.http.post<BaseResponse<{ onsite_setup_id: string }>>(url, {}).pipe(
      map((response: BaseResponse<{ onsite_setup_id: string }>) => response.data?.onsite_setup_id as string),
      catchError(err => throwError(() => ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  getOnsiteSetup(onsiteSetupId: string): Observable<OnsiteSetup> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${this.getPartnerId()}/onsite-setups/${onsiteSetupId}`;
    return this.http.get<BaseResponse<OnsiteSetup>>(url).pipe(
      map((response: BaseResponse<OnsiteSetup>) => response.data as OnsiteSetup),
      catchError(err => throwError(() => ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  getOnsiteSetupByPlace(placeId: number, onsiteSetupId: string): Observable<OnsiteSetup> {
    return this.http.get<BaseResponse<OnsiteSetup>>(this.getOnsiteSetupUrlByPlace(placeId, onsiteSetupId)).pipe(
      map((response: BaseResponse<OnsiteSetup>) => response.data as OnsiteSetup),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  getOnsiteSetups(query?: OnsiteSetupQuery): Observable<OnsiteSetup[]> {
    const params: HttpParams = this.#getParameters(query);
    return this.http.get<GetOnsiteSetupsApiResponseBody>(this.getOnsiteSetupsUrl(), { params: params }).pipe(
      map(response => this.onsiteSetupsAdapter.fromApi(response.data as OnsiteSetup[])),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getOnsiteSetupsSummary(): Observable<OnsiteSetupsSummaryDTO> {
    return this.http.get<GetOnsiteSetupsSummaryApiResponseBody>(this.getOnsiteSetupsSummaryUrl()).pipe(
      map(response => normalizeOnsiteSetupsSummary(response.data)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getSelectableOnsiteSetups(placeId: number): Observable<SelectableOnsiteSetups> {
    return this.getOnsiteSetups({ includeHidden: false, placeId }).pipe(
      switchMap(setups => this.#resolveHasHiddenSetupsOnly(setups, placeId)),
    );
  }

  updateBoxOfficeOnsiteSetup(
    placeId: number,
    onsiteSetupId: string,
    onsiteSetupName: string,
    cashRegisters: string[],
    maxPurchasableDays: number,
    shiftStrategy?: ShiftStrategyEnum,
    oboFlowType?: OboFlowTypeEnum,
    paperType?: PaperTypeEnum,
    cutterType?: CutterTypeEnum,
    priceViewer?: PriceViewerEnum,
    showSoldOutSessions?: boolean,
    ticketValidation?: TicketValidationTypeEnum,
    printTicketsCombinedForPlans?: number[],
    shiftMaxHoursOpen?: number,
    oboPrinterType?: OboPrinterTypeEnum,
    prioritizedMainPlans?: number[],
    presetCouponCodes?: string[],
    retailSetupId?: string,
    warehouseId?: string,
    productsHolderPlanId?: number,
    validationProfiles?: string[],
    accessControlSetupId?: string,
    contactInformationRequirement?: ContactInformationRequirementEnum,
    contactInformationFields?: ContactInformationFieldEnum[],
    canOverrideCapacities?: boolean,
    receiptPrinterType?: ReceiptPrinterType,
    channelId?: string,
    printConfigurationBundleId?: string | null,
    paymentConfigurationAssignment?: OnsiteSetupPaymentConfigurationAssignment,
    sessionAvailabilityCacheStrategy?: SessionAvailabilityCacheStrategyEnum,
    sessionAvailabilityCacheTimeoutInSeconds?: number,
    sessionAvailabilityPlanConfigs?: SessionAvailabilityPlanConfigDTO[],
    isHidden?: boolean,
    hardwareType?: HardwareTypeEnum,
    ticketSelectorType?: TicketSelectorTypeEnum,
    contactInformationFieldsOrder?: ContactInformationOrderableFieldEnum[],
  ): Observable<any> {
    const body = this.getBoxOfficeOnsiteSetupBody(
      onsiteSetupName,
      cashRegisters,
      maxPurchasableDays,
      shiftStrategy,
      oboFlowType,
      paperType,
      cutterType,
      priceViewer,
      showSoldOutSessions,
      ticketValidation,
      printTicketsCombinedForPlans,
      shiftMaxHoursOpen,
      OnsiteDeviceType.BOX_OFFICE,
      oboPrinterType,
      prioritizedMainPlans,
      presetCouponCodes,
      retailSetupId,
      warehouseId,
      productsHolderPlanId,
      validationProfiles,
      accessControlSetupId,
      contactInformationRequirement,
      contactInformationFields,
      canOverrideCapacities,
      receiptPrinterType,
      channelId,
      printConfigurationBundleId,
      sessionAvailabilityCacheStrategy,
      sessionAvailabilityCacheTimeoutInSeconds,
      sessionAvailabilityPlanConfigs,
      isHidden,
      hardwareType,
      ticketSelectorType,
      contactInformationFieldsOrder,
    );
    const bodyToSend: OnsiteSetupBody | OnsiteSetupBodyWithPaymentConfigurationAssignment =
      paymentConfigurationAssignment !== undefined ? this.withPaymentConfigurationAssignment(body, paymentConfigurationAssignment) : body;
    return this.http.put(this.getOnsiteSetupUrlByPlace(placeId, onsiteSetupId), bodyToSend).pipe(
      map(response => response),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  updateKioskOnsiteSetup(
    placeId: number,
    onsiteSetupId: string,
    name: string,
    maxPurchasableDays: number,
    printTicketsCombined: boolean,
    showManageBooking: boolean,
    printerCutConfiguration: KioskPrinterCutConfiguration,
    paymentMethods: string[],
    paymentGateway: PaymentCheckoutET,
    paymentExtraInformation: string,
    availableLanguages: string[],
    contactInformationRequirement: ContactInformationRequirementEnum,
    contactInformationFields: ContactInformationFieldEnum[],
    squareLocationId?: string,
    squareApplicationId?: string,
    contactInformationFieldsOrder?: ContactInformationOrderableFieldEnum[],
  ): Observable<any> {
    const body = this.getKioskOnsiteSetupBody(
      name,
      maxPurchasableDays,
      printTicketsCombined,
      showManageBooking,
      printerCutConfiguration,
      paymentMethods,
      paymentGateway,
      paymentExtraInformation,
      availableLanguages,
      contactInformationRequirement,
      contactInformationFields,
      squareLocationId,
      squareApplicationId,
      contactInformationFieldsOrder,
    );
    return this.http.put(this.getOnsiteSetupUrlByPlace(placeId, onsiteSetupId), body).pipe(
      map(response => response),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  updateOnsiteSetupHardwareType(placeId: number, onsiteSetupId: string, hardwareType: HardwareTypeEnum): Observable<void> {
    const context = new HttpContext().set(SKIP_FORBIDDEN_TOAST, true);
    return this.http.put<void>(
      `${this.getOnsiteSetupUrlByPlace(placeId, onsiteSetupId)}/hardware-type`,
      { hardware_type: hardwareType },
      { context },
    );
  }

  #getParameters(query?: OnsiteSetupQuery): HttpParams {
    const paramsObj: Record<string, string> = {};

    if (query?.placeId !== undefined && query.placeId !== null) {
      paramsObj.place_id = query.placeId.toString();
    }
    if (query?.cityId !== undefined && query.cityId !== null) {
      paramsObj.city_id = query.cityId.toString();
    }
    if (query?.itemsPerPage !== undefined && query.itemsPerPage !== null) {
      paramsObj.items_per_page = query.itemsPerPage.toString();
    }
    if (query?.page !== undefined && query.page !== null) {
      paramsObj.page = query.page.toString();
    }
    if (query?.includeHidden !== undefined && query.includeHidden !== null) {
      paramsObj.include_hidden = query.includeHidden.toString();
    }
    paramsObj.device_type = query?.deviceType ?? OnsiteDeviceType.BOX_OFFICE;

    return new HttpParams({ fromObject: paramsObj });
  }

  #resolveHasHiddenSetupsOnly(setups: Array<OnsiteSetup>, placeId: number): Observable<SelectableOnsiteSetups> {
    if (setups.length > 0) {
      return of({ hasHiddenSetupsOnly: false, setups });
    }

    return this.getOnsiteSetups({ includeHidden: true, placeId }).pipe(
      map(allSetups => ({ hasHiddenSetupsOnly: allSetups.length > 0, setups })),
      catchError(() => of({ hasHiddenSetupsOnly: false, setups })),
    );
  }

  private getBoxOfficeOnsiteSetupBody(
    name: string,
    cashRegisters: string[],
    maxPurchasableDays: number,
    shiftStrategy?: ShiftStrategyEnum,
    oboFlowType?: OboFlowTypeEnum,
    paperType?: PaperTypeEnum,
    cutterType?: CutterTypeEnum,
    priceViewer?: PriceViewerEnum,
    showSoldOutSessions?: boolean,
    ticketValidation?: TicketValidationTypeEnum,
    printTicketsCombinedForPlans?: number[],
    shiftMaxHoursOpen?: number,
    deviceType?: OnsiteDeviceType,
    oboPrinterType?: OboPrinterTypeEnum,
    prioritizedMainPlans?: number[],
    presetCouponCodes?: string[],
    retailSetupId?: string,
    warehouseId?: string,
    productsHolderPlanId?: number,
    validationProfiles?: string[],
    accessControlSetupId?: string,
    contactInformationRequirement?: ContactInformationRequirementEnum,
    contactInformationFields?: ContactInformationFieldEnum[],
    canOverrideCapacities?: boolean,
    receiptPrinterType?: ReceiptPrinterType,
    channelId?: string,
    printConfigurationBundleId?: string | null,
    sessionAvailabilityCacheStrategy?: SessionAvailabilityCacheStrategyEnum,
    sessionAvailabilityCacheTimeoutInSeconds?: number,
    sessionAvailabilityPlanConfigs?: SessionAvailabilityPlanConfigDTO[],
    isHidden?: boolean,
    hardwareType?: HardwareTypeEnum,
    ticketSelectorType?: TicketSelectorTypeEnum,
    contactInformationFieldsOrder?: ContactInformationOrderableFieldEnum[],
  ): OnsiteSetupBody {
    let body: OnsiteSetupBody = {
      name: name,
      cash_register_ids: cashRegisters,
      max_purchasable_days: maxPurchasableDays,
      obo_flow_type: oboFlowType,
      paper_type: paperType,
      cutter_type: cutterType,
      price_viewer: priceViewer,
      show_sold_out_sessions: showSoldOutSessions as boolean,
      ticket_validation: ticketValidation,
      print_tickets_combined_for_plans: printTicketsCombinedForPlans,
      shift_max_hours_open: shiftMaxHoursOpen,
      prioritized_main_plans: prioritizedMainPlans,
      preset_coupon_codes: presetCouponCodes,
      retail_setup_id: retailSetupId,
      warehouse_id: warehouseId,
      products_holder_plan_id: productsHolderPlanId,
      validation_profiles: validationProfiles != null && validationProfiles.length > 0 ? validationProfiles : undefined,
      access_control_setup_id: accessControlSetupId,
      can_override_capacities: canOverrideCapacities,
      channel_id: channelId ?? Channel.BoxOffice,
      is_hidden: isHidden,
      session_availability_cache_strategy: sessionAvailabilityCacheStrategy,
      session_availability_cache_timeout_in_seconds: sessionAvailabilityCacheTimeoutInSeconds,
      session_availability_plan_configs: sessionAvailabilityPlanConfigs,
    };
    body = shiftStrategy ? { ...body, shift_strategy: shiftStrategy } : body;
    body = deviceType ? { ...body, device_type: deviceType } : body;
    body = oboPrinterType ? { ...body, obo_printer_type: oboPrinterType } : body;
    body = receiptPrinterType ? { ...body, receipt_printer_type: receiptPrinterType } : body;
    body = hardwareType ? { ...body, hardware_type: hardwareType } : body;
    body = ticketSelectorType ? { ...body, ticket_selector_type: ticketSelectorType } : body;
    body = printConfigurationBundleId !== undefined ? { ...body, print_configuration_bundle_id: printConfigurationBundleId } : body;
    body = contactInformationRequirement
      ? {
          ...body,
          contact_information_setup: {
            requirement_on_current_day: contactInformationRequirement,
            fields: contactInformationFields ?? [ContactInformationFieldEnum.EMAIL],
            fields_order: contactInformationFieldsOrder,
          },
        }
      : body;
    return body;
  }

  private getCreateDefaultOnsiteSetupUrl(placeId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${this.getPartnerId()}/places/${placeId}/default-onsite-setups`;
  }

  private getKioskOnsiteSetupBody(
    name: string,
    maxPurchasableDays: number,
    printTicketsCombined: boolean,
    showManageBooking: boolean,
    printerCutConfiguration: KioskPrinterCutConfiguration,
    paymentMethods: string[],
    paymentGateway: PaymentCheckoutET,
    paymentExtraInformation: string,
    availableLanguages: string[],
    contactInformationRequirement: ContactInformationRequirementEnum,
    contactInformationFields: ContactInformationFieldEnum[],
    squareLocationId?: string,
    squareApplicationId?: string,
    contactInformationFieldsOrder?: ContactInformationOrderableFieldEnum[],
  ): KioskOnsiteSetupBody {
    return {
      name: name,
      max_purchasable_days: maxPurchasableDays,
      hide_plan_name: false,
      show_qr: false,
      print_tickets_combined: printTicketsCombined,
      show_manage_booking: showManageBooking,
      printer_cut_configuration: printerCutConfiguration,
      payment_methods: this.mapPaymentMethods(paymentMethods),
      kiosk_payment_gateway: paymentGateway,
      payment_extra_information: paymentExtraInformation as string,
      square_location_id: squareLocationId,
      square_application_id: squareApplicationId,
      available_languages: availableLanguages,
      contact_information_setup: {
        requirement_on_current_day: contactInformationRequirement,
        fields: contactInformationFields,
        ...(contactInformationFieldsOrder !== undefined && { fields_order: contactInformationFieldsOrder }),
      },
    };
  }

  private getOnsiteSetupsSummaryUrl(): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${this.getPartnerId()}/onsite-setups/summary`;
  }

  private getOnsiteSetupsUrl(): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${this.getPartnerId()}/onsite-setups`;
  }

  private getOnsiteSetupUrlByPlace(placeId: number, onsiteSetupId?: string): string {
    return (
      `${environment.apiGWBaseUrl}/1.0/partners/${this.getPartnerId()}/places/${placeId}/onsite-setups` +
      (onsiteSetupId ? `/${onsiteSetupId}` : '')
    );
  }

  private getPartnerId(): number {
    return this.partnerService.getPartner()?.id as number;
  }

  private mapPaymentMethods(paymentMethods: string[]) {
    return paymentMethods.map(paymentMethod => {
      return { payment_method: paymentMethod };
    });
  }

  private withPaymentConfigurationAssignment(
    body: OnsiteSetupBody,
    assignment: OnsiteSetupPaymentConfigurationAssignment,
  ): OnsiteSetupBodyWithPaymentConfigurationAssignment {
    const bodyWithAssignment: OnsiteSetupBodyWithPaymentConfigurationAssignment = { ...body };
    if (assignment.paymentConfigurationId !== null) {
      bodyWithAssignment.payment_configuration_id = assignment.paymentConfigurationId;
      bodyWithAssignment.selected_terminal_ids = assignment.selectedTerminalIds;
    }
    return bodyWithAssignment;
  }

  private withPaymentConfigurationAssignmentForCreate(
    body: OnsiteSetupBody,
    assignment: OnsiteSetupPaymentConfigurationAssignment,
  ): OnsiteSetupBodyWithPaymentConfigurationAssignment {
    return {
      ...body,
      payment_configuration_id: assignment.paymentConfigurationId,
      selected_terminal_ids: assignment.selectedTerminalIds,
    };
  }
}
