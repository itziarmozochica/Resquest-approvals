import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { OrderTaxes } from '@fz-original/app/shared/models/order/order-taxes.model';
import { User } from '@fz-original/app/shared/models/user/user.model';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { environment } from '@fz-original/environments/environment';
import { catchError, Observable, tap, throwError } from 'rxjs';

import {
  classifyHuPayment,
  FiscalLinesByTicketId,
  formatAmount,
  getLineTotal,
  sortSessionsForFiscalMapping,
} from './efsta-esr-mapper-common.util';
import {
  BuildPlEsrRequestOptions,
  buildPlPayItems,
  buildPlPosItems,
  buildPlRefundPosItems,
  buildPlRestatedPayItems,
  buildPlTaxItems,
  buildPlTenderPayItems,
  PlPaymentTender,
  polishTaxGroupToRate,
  resolvePlFiscalLineTaxGroup,
  resolvePlSurchargeTaxGroup,
  resolvePlTaxGroup,
  toPlDescription,
} from './efsta-esr-mapper-pl.util';
import {
  buildEsrRequest,
  buildHuRefundBreakdown,
  buildVatRatesFromLineItems,
  computeHuDerivedDiscount,
  hungarianTaxRateToTaxGroup,
  HuRefundBreakdown,
  isHuRescheduleCarryFullRefund,
  resolveHuCouponAmount,
  resolveSurchargeTaxGroup,
  resolveTaxGroup,
} from './efsta-esr-mapper.util';
import { EfstaFiscalGroupService } from './efsta-fiscal-group.service';
import { buildComplianceLog, ComplianceLogData } from './models/compliance-log.model';
import { EsrRegisterResponse, TraCTag } from './models/efsta-esr-response.model';
import { EsrPosItem, EsrTax } from './models/efsta-esr.model';
import { EfstaFiscalGroupResolver } from './models/efsta-fiscal-group.model';
import { FiscalCountryProfile } from './models/fiscal-country-profile.model';
import { buildPackFiscalBlocks, PackFiscalBlock } from './pack-fiscal-lines.util';

export type FiscalTransactionState = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'HEALED' | 'ERROR';

export type FiscalOperationType = 'SALE' | 'REFUND';

const FISCAL_TRANSACTION_TIMEOUT_MS = 30_000;
const FISCAL_TRANSACTION_TIMEOUT_HEADERS = new HttpHeaders({ timeout: String(FISCAL_TRANSACTION_TIMEOUT_MS) });

export interface FiscalTransactionVatRate {
  gross: string;
  net: string;
  rate: string;
  tax: string;
  tax_rate?: string;
}

export interface FiscalTransactionPaymentType {
  amount: string;
  type: string;
}

export interface FiscalTransactionLineItem {
  /**
   * Line total. Semantic duality:
   *   - When `surcharge_amount` is populated → `amount` is the ticket-only total.
   *   - When `surcharge_amount` is absent     → `amount` is the bundled ticket+surcharge total (legacy contract).
   * All readers MUST inspect `surcharge_amount != null` before interpreting `amount`.
   */
  amount: string;
  description: string;
  quantity: number;
  vat_rate: string;
  article_number?: string;
  surcharge_amount?: string;
  surcharge_vat_rate?: string;
  ticket_id?: number;
}

export interface FiscalTransactionPlTaxOptions {
  surchargeTaxGroupBySessionTypeId?: ReadonlyMap<number, string>;
  taxGroupBySessionTypeId?: ReadonlyMap<number, string>;
  taxGroupToRate?: Readonly<Record<string, number>>;
}

export interface FiscalTransactionNullResponseError {
  readonly error_code: string;
  readonly error_message: string;
}

export interface FiscalTransactionRequest {
  amounts_per_payment_type: FiscalTransactionPaymentType[] | null;
  amounts_per_vat_rate: FiscalTransactionVatRate[] | null;
  document_number: number | null;
  error_code: string | null;
  error_message: string | null;
  fiscal_number: string | null;
  line_items: FiscalTransactionLineItem[] | null;
  net_total: string | null;
  operation_type: string | null;
  operator_id: string | null;
  operator_name: string | null;
  order_id: number;
  signature_data: Record<string, string> | null;
  state: FiscalTransactionState;
  total: string | null;
  transaction_number: number | null;
  reference_fiscal_number?: string;
}

export interface FiscalTransactionResponse {
  amounts_per_payment_type: FiscalTransactionPaymentType[] | null;
  amounts_per_vat_rate: FiscalTransactionVatRate[] | null;
  created_at: string | null;
  fiscal_number: string | null;
  line_items: FiscalTransactionLineItem[] | null;
  operation_type: string | null;
  order_id: number;
  state: FiscalTransactionState;
  total: string | null;
}

interface CartData {
  cart: Cart;
  taxes: OrderTaxes[];
  fiscalCountryProfile?: FiscalCountryProfile;
  fiscalLinesByTicketId?: FiscalLinesByTicketId;
  isHuFiscalCart?: boolean;
  originalDeclaredTotal?: string | null;
  originalLineItems?: FiscalTransactionLineItem[];
  originalPaymentTypes?: readonly FiscalTransactionPaymentType[];
  paidDepositAmount?: Money | null;
  plPaymentTenders?: readonly PlPaymentTender[];
  plTaxOptions?: FiscalTransactionPlTaxOptions;
  refundedQuantityByLineIndex?: ReadonlyMap<number, number>;
  refundsPredecessorSale?: boolean;
  resolveFiscalGroup?: EfstaFiscalGroupResolver;
  surchargeTaxRateBySessionTypeId?: Map<number, number>;
  taxRateBySessionTypeId?: Map<number, number>;
}

@Injectable({
  providedIn: 'root',
})
export class FiscalTransactionApiService {
  readonly #http = inject(HttpClient);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #efstaFiscalGroupService = inject(EfstaFiscalGroupService);
  readonly #userService = inject(UserService);

  create(
    partnerId: number,
    orderId: number,
    esrResponse: EsrRegisterResponse | null,
    cart: Cart,
    taxes: OrderTaxes[],
    options?: {
      fiscalCountryProfile?: FiscalCountryProfile;
      fiscalLinesByTicketId?: FiscalLinesByTicketId;
      isHuFiscalCart?: boolean;
      logContext?: Partial<ComplianceLogData>;
      nullResponseError?: FiscalTransactionNullResponseError;
      operationType?: FiscalOperationType;
      originalDeclaredTotal?: string | null;
      originalLineItems?: FiscalTransactionLineItem[];
      originalPaymentTypes?: readonly FiscalTransactionPaymentType[];
      paidDepositAmount?: Money | null;
      plPaymentTenders?: readonly PlPaymentTender[];
      plTaxOptions?: FiscalTransactionPlTaxOptions;
      referenceFiscalNumber?: string | null;
      refundedQuantityByLineIndex?: ReadonlyMap<number, number>;
      refundsPredecessorSale?: boolean;
      surchargeTaxRateBySessionTypeId?: Map<number, number>;
      taxRateBySessionTypeId?: Map<number, number>;
    },
  ): Observable<unknown> {
    const {
      fiscalCountryProfile,
      fiscalLinesByTicketId,
      isHuFiscalCart,
      logContext,
      nullResponseError,
      operationType,
      originalDeclaredTotal,
      originalLineItems,
      originalPaymentTypes,
      paidDepositAmount,
      plPaymentTenders,
      plTaxOptions,
      referenceFiscalNumber,
      refundedQuantityByLineIndex,
      refundsPredecessorSale,
      surchargeTaxRateBySessionTypeId,
      taxRateBySessionTypeId,
    } = options ?? {};
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/fiscal/transactions`;
    let body: FiscalTransactionRequest;
    try {
      body = this.#buildRequest(
        orderId,
        esrResponse,
        {
          cart,
          fiscalCountryProfile,
          fiscalLinesByTicketId,
          isHuFiscalCart,
          originalDeclaredTotal,
          originalLineItems,
          originalPaymentTypes,
          paidDepositAmount,
          plPaymentTenders,
          plTaxOptions,
          refundedQuantityByLineIndex,
          refundsPredecessorSale,
          resolveFiscalGroup: this.#efstaFiscalGroupService.createResolver(fiscalCountryProfile, 'persist-transaction', orderId),
          surchargeTaxRateBySessionTypeId,
          taxes,
          taxRateBySessionTypeId,
        },
        nullResponseError,
        operationType,
        referenceFiscalNumber,
      );
    } catch (error: unknown) {
      return throwError(() => error);
    }
    const isRefundFlow = operationType === 'REFUND';

    return this.#http.post(url, body, { headers: FISCAL_TRANSACTION_TIMEOUT_HEADERS }).pipe(
      tap(() => {
        this.#datadogLogService.logInfo(
          'Fiscal transaction persisted to partners API',
          buildComplianceLog('persist-transaction', logContext ?? {}, {
            details: body.state === 'ERROR' ? (body.error_message ?? undefined) : undefined,
            efrResponseCode: body.error_code ?? undefined,
            orderId,
          }),
        );
      }),
      catchError((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const persistFailedPayload = buildComplianceLog('persist-transaction', logContext ?? {}, {
          details: errorMessage,
          errorCode: 'FISCAL_PERSIST_FAILED',
          orderId,
        });
        if (isRefundFlow) {
          this.#datadogLogService.logInfo('Fiscal transaction persistence to partners API failed (refund flow)', persistFailedPayload);
        } else {
          this.#datadogLogService.logError('Fiscal transaction persistence to partners API failed', persistFailedPayload);
        }
        return throwError(() => error);
      }),
    );
  }

  getByOrderId(partnerId: number, orderId: number): Observable<FiscalTransactionResponse> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/fiscal/transactions/${orderId}`;
    return this.#http.get<FiscalTransactionResponse>(url, { headers: FISCAL_TRANSACTION_TIMEOUT_HEADERS });
  }

  #buildAmountsPerPaymentType(cartData: CartData, total: string, currency?: string): FiscalTransactionPaymentType[] {
    const { cart, originalPaymentTypes, plPaymentTenders, refundsPredecessorSale, resolveFiscalGroup } = cartData;
    const isPlFiscalCart = this.#isPolishTaxGroupResolution(cartData);
    const tenderPayItems =
      isPlFiscalCart && plPaymentTenders != null ? buildPlTenderPayItems(plPaymentTenders, total, currency, resolveFiscalGroup) : undefined;

    if (tenderPayItems != null) {
      return tenderPayItems.map(payItem => ({ amount: payItem.Amt, type: payItem.Dsc }));
    }

    if (isPlFiscalCart && originalPaymentTypes != null && originalPaymentTypes.length > 0) {
      return buildPlRestatedPayItems(originalPaymentTypes, total, currency, 1).map(payItem => ({
        amount: payItem.Amt,
        type: payItem.Dsc,
      }));
    }

    if (isPlFiscalCart) {
      return buildPlPayItems(cart, total, plPaymentTenders, resolveFiscalGroup).map(payItem => ({
        amount: payItem.Amt,
        type: payItem.Dsc,
      }));
    }

    const originalPaymentType = refundsPredecessorSale ? originalPaymentTypes?.[0]?.type : undefined;
    return [
      {
        amount: total,
        type: originalPaymentType ?? classifyHuPayment(cart.paymentMethod, resolveFiscalGroup).description,
      },
    ];
  }

  #buildAmountsPerVatRate(taxes: OrderTaxes[], currency?: string): FiscalTransactionVatRate[] {
    return taxes.map(tax => {
      const gross = tax.baseAmount.amount + tax.totalAmount.amount;
      return {
        gross: formatAmount(gross, currency),
        net: formatAmount(tax.baseAmount.amount, currency),
        rate: hungarianTaxRateToTaxGroup(tax.rate),
        tax: formatAmount(tax.totalAmount.amount, currency),
      };
    });
  }

  #buildCartFields(
    cartData: CartData,
    operationType: FiscalOperationType = 'SALE',
    orderId?: number,
  ): Pick<
    FiscalTransactionRequest,
    'total' | 'net_total' | 'operation_type' | 'amounts_per_vat_rate' | 'amounts_per_payment_type' | 'line_items'
  > {
    const { cart } = cartData;
    const currency = cart.total?.currency;
    const lineItems = this.#buildLineItems(cartData, currency);
    const plRefundItems = this.#buildPlRefundPositiveItems(cartData, currency);
    const huRefundBreakdown = this.#buildHuRefundBreakdown(cartData, orderId);
    const total = this.#resolveTotal(cartData, plRefundItems, lineItems, huRefundBreakdown);
    const vatRates = this.#buildVatRates(cartData, lineItems, currency, plRefundItems, huRefundBreakdown);
    const netTotal = vatRates.reduce((sum, v) => sum + Number(v.net), 0);

    return {
      amounts_per_payment_type: this.#buildAmountsPerPaymentType(cartData, formatAmount(total, currency), currency),
      amounts_per_vat_rate: vatRates,
      line_items: lineItems,
      net_total: formatAmount(netTotal, currency),
      operation_type: operationType,
      total: formatAmount(total, currency),
    };
  }

  #buildLineItems(cartData: CartData, currency?: string): FiscalTransactionLineItem[] {
    const {
      cart,
      isHuFiscalCart,
      originalLineItems,
      plTaxOptions,
      refundedQuantityByLineIndex,
      surchargeTaxRateBySessionTypeId,
      taxes,
      taxRateBySessionTypeId,
    } = cartData;
    const isPlFiscalCart = this.#isPolishTaxGroupResolution(cartData);
    const items: FiscalTransactionLineItem[] = [];

    if (isHuFiscalCart === true || isPlFiscalCart) {
      if (refundedQuantityByLineIndex != null && originalLineItems != null) {
        for (let i = 0; i < originalLineItems.length; i++) {
          const refundedUnits = refundedQuantityByLineIndex.get(i);
          if (refundedUnits == null) continue;
          const lineItem = originalLineItems[i];
          const unitAmount = Number(lineItem.amount) / lineItem.quantity;
          items.push({
            amount: formatAmount(unitAmount * refundedUnits, currency),
            description: lineItem.description,
            quantity: refundedUnits,
            vat_rate: lineItem.vat_rate,
            ...(lineItem.article_number != null ? { article_number: lineItem.article_number } : {}),
            ...(lineItem.ticket_id != null ? { ticket_id: lineItem.ticket_id } : {}),
            ...(lineItem.surcharge_amount != null && lineItem.surcharge_vat_rate != null
              ? {
                  surcharge_amount: formatAmount((Number(lineItem.surcharge_amount) / lineItem.quantity) * refundedUnits, currency),
                  surcharge_vat_rate: lineItem.surcharge_vat_rate,
                }
              : {}),
          });
        }
        return items;
      }

      const orderedSessions = sortSessionsForFiscalMapping(cart);
      for (let i = 0; i < orderedSessions.length; i++) {
        if (refundedQuantityByLineIndex != null && !refundedQuantityByLineIndex.has(i)) {
          continue;
        }
        const session = orderedSessions[i];
        const packBlocks =
          refundedQuantityByLineIndex == null ? buildPackFiscalBlocks(session, cartData.fiscalLinesByTicketId, currency) : undefined;
        if (packBlocks != null) {
          items.push(...packBlocks.map(block => this.#buildPackLineItem(cartData, session, block, currency)));
          continue;
        }
        const refundedUnits = refundedQuantityByLineIndex?.get(i) ?? session.units;
        const description = isPlFiscalCart
          ? toPlDescription(session.sessionType?.ticketReceiptLabel ?? session.sessionType?.label ?? session.sessionName ?? `Item ${i + 1}`)
          : (session.sessionType?.ticketReceiptLabel ?? session.sessionType?.label ?? session.sessionName ?? 'Item');
        const taxGroup = isPlFiscalCart
          ? resolvePlTaxGroup(session, plTaxOptions?.taxGroupBySessionTypeId, plTaxOptions?.taxGroupToRate)
          : resolveTaxGroup(session, taxes, taxRateBySessionTypeId);
        const surchargeTotal = (session.surchargePerTicket?.amount ?? 0) * refundedUnits;
        const ticketTotal = (session.unitPrice?.amount ?? 0) * refundedUnits;
        const articleNumber = isPlFiscalCart && session.sessionType?.id != null ? { article_number: String(session.sessionType.id) } : {};

        if (surchargeTotal > 0) {
          const surchargeTaxGroup = isPlFiscalCart
            ? resolvePlSurchargeTaxGroup(session, taxGroup, plTaxOptions?.surchargeTaxGroupBySessionTypeId, plTaxOptions?.taxGroupToRate)
            : resolveSurchargeTaxGroup(session, taxGroup, surchargeTaxRateBySessionTypeId);
          items.push({
            amount: formatAmount(ticketTotal, currency),
            description,
            quantity: refundedUnits,
            surcharge_amount: formatAmount(surchargeTotal, currency),
            surcharge_vat_rate: surchargeTaxGroup,
            ticket_id: session.ticketId,
            vat_rate: taxGroup,
            ...articleNumber,
          });
        } else {
          items.push({
            amount: formatAmount(ticketTotal, currency),
            description,
            quantity: refundedUnits,
            ticket_id: session.ticketId,
            vat_rate: taxGroup,
            ...articleNumber,
          });
        }
      }
      return items;
    }

    for (const sessions of cart.sessionItemsByDatetime.values()) {
      for (const session of sessions) {
        const description = session.sessionType?.ticketReceiptLabel ?? session.sessionType?.label ?? session.sessionName ?? 'Item';
        const taxGroup = resolveTaxGroup(session, taxes, taxRateBySessionTypeId);
        items.push({
          amount: formatAmount(getLineTotal(session), currency),
          description,
          quantity: session.units,
          vat_rate: taxGroup,
        });
      }
    }

    return items;
  }

  #buildOperatorFields(): Pick<FiscalTransactionRequest, 'operator_id' | 'operator_name'> {
    const user = this.#readOperator();
    const userId: unknown = user?.id;
    const userName: unknown = user?.name;
    const trimmedName = typeof userName === 'string' ? userName.trim() : '';
    return {
      operator_id: typeof userId === 'number' && Number.isFinite(userId) ? String(userId) : null,
      operator_name: trimmedName.length > 0 ? trimmedName : null,
    };
  }

  #buildPackLineItem(cartData: CartData, session: CartSession, block: PackFiscalBlock, currency?: string): FiscalTransactionLineItem {
    const { plTaxOptions, surchargeTaxRateBySessionTypeId, taxes, taxRateBySessionTypeId } = cartData;
    const { component, fee } = block;
    const isPlFiscalCart = this.#isPolishTaxGroupResolution(cartData);
    const taxGroup = isPlFiscalCart
      ? resolvePlFiscalLineTaxGroup(component.taxRate, `sessionTypeId:${component.sessionTypeId}`, plTaxOptions?.taxGroupToRate)
      : component.taxRate != null
        ? hungarianTaxRateToTaxGroup(component.taxRate)
        : resolveTaxGroup(session, taxes, taxRateBySessionTypeId);
    const feeFields =
      fee != null
        ? {
            surcharge_amount: formatAmount(fee.amount, currency),
            surcharge_vat_rate: this.#resolvePackFeeTaxGroup(cartData, session, taxGroup, fee.taxRate, surchargeTaxRateBySessionTypeId),
          }
        : {};
    const articleNumber = isPlFiscalCart && component.sessionTypeId != null ? { article_number: String(component.sessionTypeId) } : {};

    return {
      amount: formatAmount(block.amount, currency),
      description: isPlFiscalCart ? toPlDescription(component.text) : component.text,
      quantity: component.quantity,
      ticket_id: session.ticketId,
      vat_rate: taxGroup,
      ...feeFields,
      ...articleNumber,
    };
  }

  #resolvePackFeeTaxGroup(
    cartData: CartData,
    session: CartSession,
    componentTaxGroup: string,
    feeTaxRate: number | null,
    surchargeTaxRateBySessionTypeId?: Map<number, number>,
  ): string {
    const { plTaxOptions } = cartData;
    if (this.#isPolishTaxGroupResolution(cartData)) {
      return feeTaxRate != null
        ? resolvePlFiscalLineTaxGroup(feeTaxRate, `booking fee ticketId:${session.ticketId}`, plTaxOptions?.taxGroupToRate)
        : resolvePlSurchargeTaxGroup(
            session,
            componentTaxGroup,
            plTaxOptions?.surchargeTaxGroupBySessionTypeId,
            plTaxOptions?.taxGroupToRate,
          );
    }
    return feeTaxRate != null
      ? hungarianTaxRateToTaxGroup(feeTaxRate)
      : resolveSurchargeTaxGroup(session, componentTaxGroup, surchargeTaxRateBySessionTypeId);
  }

  #buildPlRefundPositiveItems(cartData: CartData, currency?: string): EsrPosItem[] | null {
    const { cart, originalDeclaredTotal, originalLineItems, plTaxOptions, refundedQuantityByLineIndex } = cartData;
    if (!this.#isPolishTaxGroupResolution(cartData) || refundedQuantityByLineIndex == null || originalLineItems == null) {
      return null;
    }

    const declaredTotal = originalDeclaredTotal != null ? Number(originalDeclaredTotal) : Number.NaN;

    return buildPlRefundPosItems(originalLineItems, {
      coupon: cart.appliedCoupon,
      currency,
      originalDeclaredTotal: Number.isFinite(declaredTotal) ? declaredTotal : undefined,
      refundedQuantityByLineIndex,
      taxGroupToRate: plTaxOptions?.taxGroupToRate,
    }).map(item => ({ ...item, Amt: formatAmount(-Number(item.Amt), currency) }));
  }

  #buildHuRefundBreakdown(cartData: CartData, orderId?: number): HuRefundBreakdown | null {
    const { cart, isHuFiscalCart, originalDeclaredTotal, originalLineItems, refundedQuantityByLineIndex } = cartData;
    const isRescheduleCarryFullRefund =
      originalLineItems != null && isHuRescheduleCarryFullRefund(originalLineItems, refundedQuantityByLineIndex, cart.appliedCoupon);
    if (
      isHuFiscalCart !== true ||
      this.#isPolishTaxGroupResolution(cartData) ||
      refundedQuantityByLineIndex == null ||
      originalLineItems == null ||
      (!this.#declaresOriginalLineShare(cartData) && !isRescheduleCarryFullRefund)
    ) {
      return null;
    }

    const declaredTotal = originalDeclaredTotal != null ? Number(originalDeclaredTotal) : Number.NaN;
    const maxDiscount = this.#isFullRefund(cartData) ? Number.POSITIVE_INFINITY : resolveHuCouponAmount(cart.appliedCoupon);
    if (
      !Number.isFinite(declaredTotal) ||
      (!isRescheduleCarryFullRefund && computeHuDerivedDiscount(originalLineItems, declaredTotal, maxDiscount) <= 0)
    ) {
      return null;
    }

    try {
      return buildHuRefundBreakdown(
        originalLineItems,
        false,
        refundedQuantityByLineIndex,
        declaredTotal,
        cart.total?.currency,
        cart.appliedCoupon,
      );
    } catch (error: unknown) {
      this.#datadogLogService.logWarn('HU refund coupon breakdown unavailable; falling back to gross line items', {
        details: error instanceof Error ? error.message : String(error),
        errorCode: 'HU_REFUND_BREAKDOWN_FALLBACK',
        orderId,
      });
      return null;
    }
  }

  #huRefundVatRates(breakdown: HuRefundBreakdown, currency?: string): FiscalTransactionVatRate[] {
    return breakdown.taxItems.map(taxItem => ({
      gross: formatAmount(Math.abs(Number(taxItem.Amt)), currency),
      net: formatAmount(Math.abs(Number(taxItem.Net)), currency),
      rate: taxItem.TaxG,
      tax: formatAmount(Math.abs(Number(taxItem.TAmt)), currency),
    }));
  }

  #buildPlVatRates(
    lineItems: FiscalTransactionLineItem[],
    taxGroupToRate?: Readonly<Record<string, number>>,
    currency?: string,
  ): FiscalTransactionVatRate[] {
    const grossByTaxGroup = new Map<string, number>();
    for (const item of lineItems) {
      grossByTaxGroup.set(item.vat_rate, (grossByTaxGroup.get(item.vat_rate) ?? 0) + Number(item.amount));
      if (item.surcharge_amount != null && item.surcharge_vat_rate != null) {
        grossByTaxGroup.set(item.surcharge_vat_rate, (grossByTaxGroup.get(item.surcharge_vat_rate) ?? 0) + Number(item.surcharge_amount));
      }
    }

    return [...grossByTaxGroup.entries()].map(([taxGroup, gross]) => {
      const rate = polishTaxGroupToRate(taxGroup, taxGroupToRate);
      const tax = (gross * rate) / (100 + rate);
      return {
        gross: formatAmount(gross, currency),
        net: formatAmount(gross - tax, currency),
        rate: taxGroup,
        tax: formatAmount(tax, currency),
        tax_rate: String(rate),
      };
    });
  }

  #buildReferenceFields(
    operationType: FiscalOperationType,
    referenceFiscalNumber?: string | null,
  ): Pick<FiscalTransactionRequest, 'reference_fiscal_number'> {
    if (operationType !== 'REFUND') {
      return {};
    }
    const normalizedReferenceFiscalNumber = this.#normalizeFiscalNumber(referenceFiscalNumber ?? undefined);
    return normalizedReferenceFiscalNumber == null ? {} : { reference_fiscal_number: normalizedReferenceFiscalNumber };
  }

  #buildRequest(
    orderId: number,
    esrResponse: EsrRegisterResponse | null,
    cartData: CartData,
    nullResponseError?: FiscalTransactionNullResponseError,
    operationType: FiscalOperationType = 'SALE',
    referenceFiscalNumber?: string | null,
  ): FiscalTransactionRequest {
    const cartFields = this.#buildCartFields(cartData, operationType, orderId);
    const referenceFields = this.#buildReferenceFields(operationType, referenceFiscalNumber);
    const operatorFields = this.#buildOperatorFields();

    if (esrResponse == null) {
      const fallback: FiscalTransactionNullResponseError = nullResponseError ?? {
        error_code: 'EFSTA_TIMEOUT_OR_NETWORK',
        error_message: 'EFSTA registration returned null (timeout or network error)',
      };
      return {
        document_number: null,
        error_code: fallback.error_code,
        error_message: fallback.error_message,
        fiscal_number: null,
        order_id: orderId,
        signature_data: null,
        state: 'ERROR',
        transaction_number: null,
        ...cartFields,
        ...operatorFields,
        ...referenceFields,
      };
    }

    const result = esrResponse.TraC?.Result;
    const esr = esrResponse.TraC?.ESR;
    const fis = esrResponse.TraC?.Fis;
    const isSuccess = result?.RC === 'OK' && !result?.ErrorCode;

    return {
      document_number: null,
      error_code: result?.ErrorCode?.trim() || null,
      error_message: isSuccess ? null : result?.ErrorCode?.trim() || result?.RC?.trim() || null,
      fiscal_number: this.#normalizeFiscalNumber(esr?.FN),
      order_id: orderId,
      signature_data: this.#buildSignatureData(fis?.Tag),
      state: isSuccess ? 'COMPLETED' : 'ERROR',
      transaction_number: this.#normalizeTransactionNumber(fis?.TID) ?? this.#normalizeTransactionNumber(esr?.TN),
      ...cartFields,
      ...operatorFields,
      ...referenceFields,
    };
  }

  #normalizeFiscalNumber(fiscalNumber: string | number | undefined): string | null {
    if (fiscalNumber == null) {
      return null;
    }
    const normalizedFiscalNumber = String(fiscalNumber).trim();
    return normalizedFiscalNumber.length === 0 ? null : normalizedFiscalNumber;
  }

  #normalizeTransactionNumber(transactionId: string | number | undefined): number | null {
    const normalizedTransactionId = this.#normalizeFiscalNumber(transactionId);
    if (normalizedTransactionId == null || !/^\d+$/.test(normalizedTransactionId)) {
      return null;
    }
    const transactionNumber = Number(normalizedTransactionId);
    return Number.isSafeInteger(transactionNumber) && transactionNumber > 0 ? transactionNumber : null;
  }

  #readOperator(): User | null {
    try {
      return this.#userService.getUser();
    } catch {
      return null;
    }
  }

  #buildSignatureData(tags: TraCTag[] | undefined): Record<string, string> | null {
    if (!tags?.length) {
      return null;
    }

    const data: Record<string, string> = {};
    for (const tag of tags) {
      data[tag.Name] = tag.Value;
    }
    return data;
  }

  #buildVatRates(
    cartData: CartData,
    lineItems: FiscalTransactionLineItem[],
    currency?: string,
    plRefundItems?: EsrPosItem[] | null,
    huRefundBreakdown?: HuRefundBreakdown | null,
  ): FiscalTransactionVatRate[] {
    const { cart, plTaxOptions, refundedQuantityByLineIndex, surchargeTaxRateBySessionTypeId, taxes, taxRateBySessionTypeId } = cartData;

    if (this.#isPolishTaxGroupResolution(cartData)) {
      if (plRefundItems != null) {
        return this.#toVatRates(buildPlTaxItems(plRefundItems, currency, plTaxOptions?.taxGroupToRate));
      }
      if (refundedQuantityByLineIndex != null) {
        return this.#buildPlVatRates(lineItems, plTaxOptions?.taxGroupToRate, currency);
      }
      return this.#toVatRates(
        buildPlTaxItems(buildPlPosItems(cart, this.#buildPlPosItemsOptions(cartData)), currency, plTaxOptions?.taxGroupToRate),
      );
    }
    if (huRefundBreakdown != null) {
      return this.#huRefundVatRates(huRefundBreakdown, currency);
    }
    if (this.#declaresOriginalLineShare(cartData)) {
      return buildVatRatesFromLineItems(lineItems, currency);
    }
    if (this.#resolvePaidDepositAmount(cartData) > 0) {
      const esrRequest = buildEsrRequest(0, cart, taxes, {
        fiscalLinesByTicketId: cartData.fiscalLinesByTicketId,
        paidDepositAmount: cartData.paidDepositAmount,
        surchargeTaxRateBySessionTypeId,
        taxRateBySessionTypeId,
      });
      return this.#toVatRates(esrRequest.Tra.ESR.TaxA ?? []);
    }
    return this.#buildAmountsPerVatRate(taxes, currency);
  }

  #declaresOriginalLineShare(cartData: CartData): boolean {
    return cartData.refundedQuantityByLineIndex != null && (cartData.refundsPredecessorSale === true || !this.#isFullRefund(cartData));
  }

  #isFullRefund(cartData: CartData): boolean {
    const { originalLineItems, refundedQuantityByLineIndex } = cartData;
    if (refundedQuantityByLineIndex == null || originalLineItems == null || originalLineItems.length === 0) {
      return false;
    }
    return (
      refundedQuantityByLineIndex.size === originalLineItems.length &&
      originalLineItems.every((lineItem, index) => refundedQuantityByLineIndex.get(index) === lineItem.quantity)
    );
  }

  #isPolishTaxGroupResolution(cartData: CartData): boolean {
    return cartData.fiscalCountryProfile?.taxGroupResolution === 'poland-tax-group';
  }

  #resolveTotal(
    cartData: CartData,
    plRefundItems: EsrPosItem[] | null,
    lineItems: FiscalTransactionLineItem[],
    huRefundBreakdown: HuRefundBreakdown | null,
  ): number {
    const { cart } = cartData;
    if (plRefundItems != null) {
      return plRefundItems.reduce((sum, item) => sum + Number(item.Amt), 0);
    }
    if (huRefundBreakdown != null) {
      return Math.abs(huRefundBreakdown.total);
    }
    const lineItemsTotal = lineItems.reduce((sum, item) => sum + Number(item.amount) + Number(item.surcharge_amount ?? 0), 0);
    if (this.#declaresOriginalLineShare(cartData)) {
      return lineItemsTotal;
    }
    if (cart.total?.amount != null) {
      return cart.total.amount - this.#resolvePaidDepositAmount(cartData);
    }
    if (this.#isPolishTaxGroupResolution(cartData)) {
      return buildPlPosItems(cart, this.#buildPlPosItemsOptions(cartData)).reduce((sum, item) => sum + Number(item.Amt), 0);
    }
    return lineItemsTotal;
  }

  /**
   * Same guard as the ESR mappers: a deposit in another currency than the cart is not comparable,
   * so it is not deducted rather than silently mixing units.
   */
  #resolvePaidDepositAmount(cartData: CartData): number {
    const { cart, paidDepositAmount } = cartData;
    if (paidDepositAmount == null || !Number.isFinite(paidDepositAmount.amount) || paidDepositAmount.amount <= 0) {
      return 0;
    }
    const currency = cart.total?.currency;
    if (currency != null && paidDepositAmount.currency !== currency) {
      return 0;
    }
    return paidDepositAmount.amount;
  }

  #buildPlPosItemsOptions(cartData: CartData): BuildPlEsrRequestOptions {
    return {
      ...cartData.plTaxOptions,
      fiscalLinesByTicketId: cartData.fiscalLinesByTicketId,
      paidDepositAmount: cartData.paidDepositAmount,
    };
  }

  #toVatRates(taxItems: readonly EsrTax[]): FiscalTransactionVatRate[] {
    return taxItems.map(taxItem => ({
      gross: taxItem.Amt,
      net: taxItem.Net,
      rate: taxItem.TaxG,
      tax: taxItem.TAmt,
      tax_rate: taxItem.Prc,
    }));
  }
}
