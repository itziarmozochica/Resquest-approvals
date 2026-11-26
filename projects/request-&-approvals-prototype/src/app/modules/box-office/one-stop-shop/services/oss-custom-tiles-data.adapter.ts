import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { BookingQuestion } from '@fz-original/app/shared/models/booking-questions/booking-question.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { Seat } from '@fz-original/app/shared/models/session-availability/seat.model';
import { SessionType } from '@fz-original/app/shared/models/session-type/session-type.model';
import { sessionTypeTileColor } from '@fz-original/app/shared/tags/utils/session-type-tile-color.util';

import {
  OssCustomTile,
  OssCustomTileDto,
  OssCustomTileExtraInfo,
  OssCustomTileExtraInfoDto,
  OssCustomTileExtraInfoHierarchyElementDto,
  OssCustomTileExtraInfoSessionTypeDto,
  OssCustomTilesData,
  OssCustomTilesDataDto,
  OssCustomTileWrapper,
  OssCustomTileWrapperDto,
  OssHierarchyCategory,
  OssHierarchyCategoryDto,
  OssHierarchyProduct,
  OssHierarchyProductDto,
  OssHierarchyProductVariation,
  OssHierarchyProductVariationDto,
  OssSessionAvailability,
  OssSessionAvailabilityDto,
  OssTargetElementType,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class OssCustomTilesDataAdapter implements AdapterInterface<BaseResponse<OssCustomTilesData>> {
  fromApi(response: BaseResponse<OssCustomTilesDataDto>): BaseResponse<OssCustomTilesData> {
    return new BaseResponse<OssCustomTilesData>(this.#getData(response?.data), this.#getError(response?.error));
  }

  #convertHierarchyCategories(categories: OssHierarchyCategoryDto[]): OssHierarchyCategory[] {
    return categories.map(category => ({
      name: category.name,
      children: category.children ? this.#convertHierarchyCategories(category.children) : undefined,
      products: category.products ? this.#convertHierarchyProducts(category.products) : undefined,
      productVariations: category.product_variations ? this.#convertHierarchyProductVariations(category.product_variations) : undefined,
    }));
  }

  #convertHierarchyProductVariations(variations: OssHierarchyProductVariationDto[]): OssHierarchyProductVariation[] {
    return variations.map(variation => ({
      sessionId: variation.session_id,
    }));
  }

  #convertHierarchyProducts(products: OssHierarchyProductDto[]): OssHierarchyProduct[] {
    return products.map(product => ({
      name: product.name,
      productVariations: this.#convertHierarchyProductVariations(product.product_variations),
    }));
  }

  #convertCustomTile(tileDto: OssCustomTileDto): OssCustomTile {
    return {
      position: tileDto.position,
      color: tileDto.color,
      name: tileDto.name,
      targetElementExtraInfo: this.#convertTargetElementExtraInfo(tileDto.target_element_type, tileDto.target_element_extra_info),
      targetElementType: tileDto.target_element_type,
      sessions: this.#convertSessionAvailability(tileDto.sessions),
    };
  }

  #convertCustomTileWrappers(wrappers: OssCustomTileWrapperDto[]): OssCustomTileWrapper[] {
    return wrappers
      .map(wrapper => ({
        customTile: this.#convertCustomTile(wrapper.custom_tile),
      }))
      ?.sort((wrapperA, wrapperB) => wrapperA.customTile.position - wrapperB.customTile.position);
  }

  #convertSessionAvailability(sessions: OssSessionAvailabilityDto[]) {
    return sessions.map(session => this.#createSessionAvailabilityFromDateTimeItem(session));
  }

  #convertTargetElementExtraInfo(type: OssTargetElementType, extraInfo: OssCustomTileExtraInfoDto): OssCustomTileExtraInfo | null {
    if (type === OssTargetElementType.SESSION_TYPE) {
      const sessionTypeInfo = extraInfo as OssCustomTileExtraInfoSessionTypeDto;
      return {
        placeName: sessionTypeInfo.place_name ?? null,
        placeCityTimezone: sessionTypeInfo.place_city_timezone ?? null,
      };
    }
    if (
      type === OssTargetElementType.HIERARCHY_ELEMENT ||
      type === OssTargetElementType.PARENT_HIERARCHY_ELEMENT ||
      type === OssTargetElementType.PRODUCT
    ) {
      const hierarchyElementInfo = extraInfo as OssCustomTileExtraInfoHierarchyElementDto;
      return {
        name: hierarchyElementInfo.name,
        placeCityTimezone: hierarchyElementInfo.place_city_timezone ?? null,
        children: hierarchyElementInfo.children ? this.#convertHierarchyCategories(hierarchyElementInfo.children) : undefined,
        products: hierarchyElementInfo.products ? this.#convertHierarchyProducts(hierarchyElementInfo.products) : undefined,
        productVariations: hierarchyElementInfo.product_variations
          ? this.#convertHierarchyProductVariations(hierarchyElementInfo.product_variations)
          : undefined,
      };
    }
    return null;
  }

  #createSessionAvailabilityFromDateTimeItem(sessionAvailability: OssSessionAvailabilityDto): OssSessionAvailability {
    return new OssSessionAvailability(
      sessionAvailability.id,
      sessionAvailability.title,
      sessionAvailability.start_date,
      sessionAvailability.end_date,
      new Money(sessionAvailability.price.amount, sessionAvailability.price.currency),
      sessionAvailability.sellable,
      sessionAvailability.available_tickets,
      sessionAvailability.tickets_allowed_per_booking.minimum,
      sessionAvailability.tickets_allowed_per_booking.maximum,
      sessionAvailability.purchasable_from_date,
      sessionAvailability.purchasable_until_date,
      sessionAvailability.is_hidden || false,
      sessionAvailability.surcharge_per_ticket
        ? new Money(sessionAvailability.surcharge_per_ticket.amount, sessionAvailability.surcharge_per_ticket.currency)
        : undefined,
      sessionAvailability.seating ? new Seat(sessionAvailability.seating.category, [], sessionAvailability.seating.pool_id) : null,
      sessionAvailability.booking_questions
        ? sessionAvailability.booking_questions.map(
            bookingQuestion =>
              new BookingQuestion(
                bookingQuestion.id,
                bookingQuestion.label,
                bookingQuestion.message,
                bookingQuestion.type,
                bookingQuestion.choices,
              ),
          )
        : null,
      null,
      sessionAvailability.session_type
        ? new SessionType(
            sessionAvailability.session_type.id,
            sessionAvailability.session_type.label,
            sessionAvailability.session_type.is_pass,
            sessionAvailability.session_type.is_add_on,
            sessionAvailability.session_type.reservation_restriction,
            sessionAvailability.session_type.ticket_receipt_label,
            sessionAvailability.session_type.ignore_time_slot_capacity,
            sessionAvailability.session_type.allowed_num_tickets?.minimum,
            sessionAvailability.session_type.allowed_num_tickets?.maximum,
            sessionAvailability.session_type.is_shop_product,
            undefined,
            undefined,
            undefined,
            undefined,
            sessionTypeTileColor(sessionAvailability.session_type.color) ?? undefined,
          )
        : undefined,
      sessionAvailability.details,
      sessionAvailability.main_plan_id,
      sessionAvailability.place_id,
    );
  }

  #getData(data: OssCustomTilesDataDto | null | undefined): OssCustomTilesData | null {
    if (!data) {
      return null;
    }

    return { customTiles: this.#convertCustomTileWrappers(data.custom_tiles) };
  }

  #getError(data: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}
