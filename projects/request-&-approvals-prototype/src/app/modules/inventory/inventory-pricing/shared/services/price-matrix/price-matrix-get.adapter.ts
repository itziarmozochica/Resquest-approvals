import { inject, Injectable } from '@angular/core';

import { PriceListParser } from '@fz-original/app/modules/inventory/shared/services/price-list/price-list-parser';
import { IBaseResponse } from '@fz-original/app/shared/models/base-response';
import { Money } from '@fz-original/app/shared/models/money.model';

import {
  PriceMatrixItem,
  PriceMatrixItemAllChannels,
  PriceMatrixItemDTO,
  PriceMatrixItemNotAllChannels,
  PriceMatrixPrice,
  PriceMatrixPriceDTO,
  PriceMatrixResponse,
  PriceMatrixResponseDTO,
  TargetedTier,
  TargetedTierDTO,
  TargetedTimeSlot,
  TargetedTimeSlotDTO,
} from './price-matrix.model';

@Injectable({
  providedIn: 'root',
})
export class PriceMatrixGetAdapter {
  #parser = inject(PriceListParser);

  fromApi(response: IBaseResponse<PriceMatrixResponseDTO>): PriceMatrixResponse {
    if (response.error || response.data === null) {
      throw response.error;
    }

    return this.#getData(response.data);
  }

  #adaptPrice(dto: PriceMatrixPriceDTO): PriceMatrixPrice {
    return {
      priceListItemId: dto.price_list_item_id,
      sessionTypeId: dto.session_type_id,
      strikethroughPrice: dto.strikethrough_price ? new Money(dto.strikethrough_price.amount, dto.strikethrough_price.currency) : null,
      surchargePrice: new Money(dto.surcharge_price.amount, dto.surcharge_price.currency),
      ticketPrice: new Money(dto.ticket_price.amount, dto.ticket_price.currency),
    };
  }

  #adaptPriceMatrixItem(dto: PriceMatrixItemDTO): PriceMatrixItem {
    const activationRanges = dto.activation_ranges?.map(range => this.#parser.parseDateRangeDTO(range)) ?? null;

    const baseItem = {
      appliesToAllChannels: dto.applies_to_all_channels,
      channels: dto.channels,
      id: dto.id,
      isBase: dto.is_base,
      enabled: dto.enabled,
      activationRanges,
      mustUseTaxBase: dto.must_use_tax_base,
      name: dto.name,
      prices: this.#adaptPrices(dto.prices),
      targetedTier: this.#adaptTargetedTier(dto.targeted_tier),
      targetedTimeSlots: this.#adaptTargetedTimeSlots(dto.targeted_time_slots),
    };

    if (dto.applies_to_all_channels) {
      return {
        ...baseItem,
        appliesToAllChannels: true,
      } as PriceMatrixItemAllChannels;
    } else {
      return {
        ...baseItem,
        appliesToAllChannels: false,
        channels: dto.channels || [],
      } as PriceMatrixItemNotAllChannels;
    }
  }

  #adaptPrices(dtos: PriceMatrixPriceDTO[]): PriceMatrixPrice[] {
    return dtos.map(price => this.#adaptPrice(price));
  }

  #adaptTargetedTier(dto: TargetedTierDTO | null): TargetedTier | null {
    if (!dto) {
      return null;
    }

    return {
      color: dto.color,
      id: dto.id,
      name: dto.name,
    };
  }

  #adaptTargetedTimeSlot(dto: TargetedTimeSlotDTO): TargetedTimeSlot {
    return {
      dateEnd: dto.date_end,
      dateStart: dto.date_start,
      endDate: dto.end_date,
      endTime: dto.end_time,
      startDate: dto.start_date,
      startTime: dto.start_time,
      timezone: dto.timezone,
      weekdays: dto.weekdays,
    };
  }

  #adaptTargetedTimeSlots(dto: TargetedTimeSlotDTO[] | null): TargetedTimeSlot[] | null {
    if (!dto) {
      return null;
    }

    return dto.map(slot => this.#adaptTargetedTimeSlot(slot));
  }

  #getData(data: PriceMatrixResponseDTO): PriceMatrixResponse {
    return {
      mustUseTaxBase: data.must_use_tax_base,
      priceLists: data.price_lists.map(item => this.#adaptPriceMatrixItem(item)),
    };
  }
}
