import { Injectable } from '@angular/core';

import moment from 'moment-timezone';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { WeekDay } from '../../../../shared/components/week-days-selector/week-days-selector.component';
import { BaseResponse } from '../../../../shared/models/base-response';
import { TemplateCouponDetail } from '../../models/template-coupon/template-coupon-detail.model';
import { TemplateCouponPatch } from '../../models/template-coupon/template-coupon-patch.model';
import { TemplateCouponStatus } from '../../models/template-coupon/template-coupon.model';
import { TimeSlotFilter } from '../../models/template-coupon/time-slot-filter.model';
import { toUsageLimitValue } from '../../utils/template-coupon-usage-limit.util';
import { TemplateCouponAdvancedSelectionFilterDTO } from './template-coupon-advanced-selection-filter.dto';
import { TemplateCouponCreateDTO } from './template-coupon-create.dto';
import { TemplateCouponDetailDTO } from './template-coupon-detail.dto';
import { TemplateCouponPatchDTO } from './template-coupon-patch.dto';
import { TemplateCouponSelectionFilters } from './template-coupon-selection-filters.dto';

// TODO: check why the heck there were no validations at all.
@Injectable({
  providedIn: 'root',
})
export class TemplateCouponDetailAdapter implements AdapterInterface<TemplateCouponDetail> {
  fromApi(templateCouponDetailResponse: BaseResponse<TemplateCouponDetailDTO>): TemplateCouponDetail {
    const data = templateCouponDetailResponse.data;
    if (!data) {
      throw new Error('template coupon detail data missing.');
    }
    const bundleBuy = data.buy_m_pay_n ? data.buy_m_pay_n[0] : null;
    const bundlePay = data.buy_m_pay_n ? data.buy_m_pay_n[1] : null;
    return {
      appliesToSurcharge: data.applies_to_surcharge ?? false,
      title: data.title,
      description: data.description,
      code: data.code,
      codePrefix: data.code_prefix,
      countToCreate: data.count_to_create,
      discountType: data.kind,
      couponType: data.template_coupon_type,
      discountQuantity: data.discount_quantity,
      currencyIdentifier: data.currency_identifier,
      availableRedeems: data.available_usages,
      availablePurchases: data.available_purchases ?? null,
      maxUsesPerUser: data.max_uses_per_user,
      maxTicketsPerOrder: data.max_number_tickets_per_order,
      minTicketsPerOrder: data.min_number_tickets_per_order ?? null,
      numberOfTicketsPurchasable: data.number_of_tickets_purchasable ?? null,
      startDate: this.#parseDateFromString(data.start_date),
      expirationDate: this.#parseDateFromString(data.expiration_date),
      restrictedChannelIds: data.selection_filters.channel_ids,
      restrictedCityIds: data.selection_filters.city_ids,
      restrictedPlanIds: data.selection_filters.main_plan_ids,
      timeSlotFilters: this.#parseAdvancedSelectionFiltersToModel(data.advanced_selection_filters),
      restrictedSessionTypeIds: data.selection_filters.session_type_ids,
      status: data.status as TemplateCouponStatus,
      isActive: data.is_active,
      bundleBuy: bundleBuy,
      bundlePay: bundlePay,
      bundleUsageLimit: this.#calculateBundleUsageLimit(bundleBuy, data.max_number_tickets_per_order),
      currentConsumptions: data.current_consumptions,
      currentUsages: data.current_usages,
      totalAvailableUsages: data.total_available_usages,
      totalAvailableConsumptions: data.total_available_consumptions,
    };
  }

  toCreateApi(templateCouponDetail: Partial<TemplateCouponDetail>): TemplateCouponCreateDTO {
    return {
      applies_to_surcharge: templateCouponDetail.appliesToSurcharge ?? false,
      title: templateCouponDetail.title || null,
      description: templateCouponDetail.description || '',
      code: templateCouponDetail.code || null,
      code_prefix: templateCouponDetail.codePrefix || null,
      count_to_create: templateCouponDetail.countToCreate || null,
      template_coupon_type: templateCouponDetail.couponType || 'default',
      kind: templateCouponDetail.discountType || 'money',
      discount_quantity: templateCouponDetail.discountQuantity ?? null,
      currency_identifier: templateCouponDetail.currencyIdentifier || null,
      available_redeems: toUsageLimitValue(templateCouponDetail.availableRedeems),
      available_purchases: toUsageLimitValue(templateCouponDetail.availablePurchases),
      max_uses_per_user: toUsageLimitValue(templateCouponDetail.maxUsesPerUser),
      number_of_tickets_purchasable: toUsageLimitValue(templateCouponDetail.numberOfTicketsPurchasable),
      max_number_tickets_per_order: toUsageLimitValue(templateCouponDetail.maxTicketsPerOrder),
      min_number_tickets_per_order: toUsageLimitValue(templateCouponDetail.minTicketsPerOrder),
      start_date: this.#parseDateToString(templateCouponDetail.startDate) || null,
      expiration_date: this.#parseDateToString(templateCouponDetail.expirationDate) || null,
      buy_m_pay_n: this.#parseBundleToApi(templateCouponDetail.bundleBuy, templateCouponDetail.bundlePay),
      selection_filters: {
        channel_ids: templateCouponDetail.restrictedChannelIds || [],
        main_plan_ids: templateCouponDetail.restrictedPlanIds || [],
        city_ids: templateCouponDetail.restrictedCityIds || [],
        session_type_ids: templateCouponDetail.restrictedSessionTypeIds || [],
      },
      advanced_selection_filters: this.#parseTimeSlotsAdvancedSelectionFiltersToApi(templateCouponDetail.timeSlotFilters),
    };
  }

  toPatchApi(templateCouponPatch: Partial<TemplateCouponPatch>): Partial<TemplateCouponPatchDTO> {
    const body: Partial<TemplateCouponPatchDTO> = {};
    const hasRestrictedFilter =
      templateCouponPatch.restrictedChannelIds !== undefined ||
      templateCouponPatch.restrictedPlanIds !== undefined ||
      templateCouponPatch.restrictedCityIds !== undefined ||
      templateCouponPatch.restrictedSessionTypeIds !== undefined;

    type FieldMapping = {
      source: keyof TemplateCouponPatch;
      target: keyof TemplateCouponPatchDTO;
      transform?: (value: unknown) => unknown;
    };
    const fieldMappings: Array<FieldMapping> = [
      { source: 'isActive', target: 'is_active' },
      { source: 'title', target: 'title' },
      { source: 'description', target: 'description' },
      { source: 'discountType', target: 'kind' },
      { source: 'discountQuantity', target: 'discount_quantity' },
      { source: 'currencyIdentifier', target: 'currency_identifier' },
      { source: 'appliesToSurcharge', target: 'applies_to_surcharge' },
      { source: 'availableRedeems', target: 'available_redeems', transform: toUsageLimitValue },
      { source: 'availablePurchases', target: 'available_purchases', transform: toUsageLimitValue },
      { source: 'maxUsesPerUser', target: 'max_uses_per_user', transform: toUsageLimitValue },
      { source: 'maxTicketsPerOrder', target: 'max_number_tickets_per_order', transform: toUsageLimitValue },
      { source: 'minTicketsPerOrder', target: 'min_number_tickets_per_order', transform: toUsageLimitValue },
      { source: 'numberOfTicketsPurchasable', target: 'number_of_tickets_purchasable', transform: toUsageLimitValue },
      {
        source: 'startDate',
        target: 'start_date',
        transform: (value: unknown) => this.#parseDateToString(value as Date | null | undefined),
      },
      {
        source: 'expirationDate',
        target: 'expiration_date',
        transform: (value: unknown) => this.#parseDateToString(value as Date | null | undefined) || null,
      },
      {
        source: 'timeSlotFilters',
        target: 'advanced_selection_filters',
        transform: (value: unknown) => this.#parseTimeSlotsAdvancedSelectionFiltersToApi(value as Array<TimeSlotFilter> | undefined | null),
      },
    ];

    for (const mapping of fieldMappings) {
      if (templateCouponPatch[mapping.source] !== undefined) {
        const value = templateCouponPatch[mapping.source];
        (body as Record<string, unknown>)[mapping.target] = mapping.transform ? mapping.transform(value) : value;
      }
    }

    if (templateCouponPatch.bundleBuy !== undefined || templateCouponPatch.bundlePay !== undefined) {
      body.buy_m_pay_n = this.#parseBundleToApi(templateCouponPatch.bundleBuy, templateCouponPatch.bundlePay);
    }

    if (hasRestrictedFilter) {
      body.selection_filters = {} as TemplateCouponSelectionFilters;

      if (templateCouponPatch.restrictedChannelIds !== undefined) {
        body.selection_filters.channel_ids = templateCouponPatch.restrictedChannelIds;
      }
      if (templateCouponPatch.restrictedPlanIds !== undefined) {
        body.selection_filters.main_plan_ids = templateCouponPatch.restrictedPlanIds;
      }
      if (templateCouponPatch.restrictedCityIds !== undefined) {
        body.selection_filters.city_ids = templateCouponPatch.restrictedCityIds;
      }
      if (templateCouponPatch.restrictedSessionTypeIds !== undefined) {
        body.selection_filters.session_type_ids = templateCouponPatch.restrictedSessionTypeIds;
      }
    }

    return body;
  }

  #calculateBundleUsageLimit(bundleBuy: number | null, maxTicketsPerOrder: number | null): number | null {
    if (!bundleBuy || !maxTicketsPerOrder) {
      return null;
    }

    return maxTicketsPerOrder / bundleBuy;
  }

  #parseAdvancedSelectionFiltersToModel(advancedSelectionFilters: Array<TemplateCouponAdvancedSelectionFilterDTO>): Array<TimeSlotFilter> {
    if (!advancedSelectionFilters) {
      return [];
    }
    return advancedSelectionFilters.map(advancedSelectionFilter => ({
      startDate: advancedSelectionFilter.filter_value.start_date,
      endDate: advancedSelectionFilter.filter_value.end_date,
      weekDays: advancedSelectionFilter.filter_value.days_a_week as Array<WeekDay>,
      firstTime: advancedSelectionFilter.filter_value.start_time_slot,
      lastTime: advancedSelectionFilter.filter_value.end_time_slot,
    }));
  }

  #parseBundleToApi(bundleBuy: number | null | undefined, bundlePay: number | null | undefined): Array<number> | null {
    if (bundleBuy === undefined || bundlePay === undefined) {
      return null;
    }
    if (bundleBuy === null || bundlePay === null) {
      return null;
    }

    return [bundleBuy, bundlePay];
  }

  #parseDateFromString(date: string | null | undefined): Date | null {
    return date ? moment(date).toDate() : null;
  }

  #parseDateToString(date: Date | null | undefined): string | null {
    if (!date) {
      return null;
    }

    return (
      date &&
      new Date(
        Date.UTC(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          date.getMinutes(),
          date.getSeconds(),
          date.getMilliseconds(),
        ),
      )
        .toISOString()
        .replace('.000Z', 'Z')
    );
  }

  #parseTimeSlotsAdvancedSelectionFiltersToApi(
    timeSlotFilters: Array<TimeSlotFilter> | undefined | null,
  ): Array<TemplateCouponAdvancedSelectionFilterDTO> {
    if (!timeSlotFilters) {
      return [];
    }
    return timeSlotFilters.map(timeSlotFilter => {
      return {
        filter_id: 'time_slots',
        filter_value: {
          start_date: timeSlotFilter.startDate,
          end_date: timeSlotFilter.endDate,
          days_a_week: timeSlotFilter.weekDays,
          start_time_slot: timeSlotFilter.firstTime,
          end_time_slot: timeSlotFilter.lastTime,
        },
      };
    });
  }
}
