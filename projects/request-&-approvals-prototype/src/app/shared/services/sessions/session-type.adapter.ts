import { inject, Injectable } from '@angular/core';

import { SanitizeService } from '@fz-original/app/app/services/sanitize/sanitize.service';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import {
  SessionType,
  SessionTypeChannel,
  SessionTypeChannelDTO,
  SessionTypeDTO,
  SessionTypeGroup,
  SessionTypeGroupDTO,
} from './session-type.model';

type BaseResponseDTO<T> = Pick<BaseResponse<T>, 'data' | 'error'>;

export type SessionTypeResponseDTO = BaseResponseDTO<SessionTypeDTO>;

@Injectable({
  providedIn: 'root',
})
export class SessionTypeAdapter implements AdapterInterface<SessionType, SessionTypeResponseDTO> {
  #sanitizeService: SanitizeService = inject(SanitizeService);

  fromApi(response: SessionTypeResponseDTO): SessionType {
    if (response.error) {
      throw response.error;
    }

    if (response.data === null) {
      throw new Error('Response data is null');
    }

    return this.getData(response.data);
  }

  private getData(sessionTypeDTO: SessionTypeDTO): SessionType {
    return {
      id: sessionTypeDTO.id,
      label: sessionTypeDTO.label,
      ...(sessionTypeDTO.allowed_num_tickets ? { allowedNumTickets: sessionTypeDTO.allowed_num_tickets } : null),
      ...(sessionTypeDTO.instructions ? { instructions: this.#sanitizeService.sanitizeToString(sessionTypeDTO.instructions) } : null),
      details: this.#sanitizeService.sanitizeToString(sessionTypeDTO.details),
      isAddOn: sessionTypeDTO.is_add_on,
      useForAvailability: sessionTypeDTO.use_for_availability,
      ...(sessionTypeDTO.default_capacity ? { defaultCapacity: sessionTypeDTO.default_capacity } : null),
      groups: sessionTypeDTO.groups.map(group => this.adaptGroup(group)),
      productType: sessionTypeDTO.product_type,
      tags: sessionTypeDTO.tags,
      displayStep: sessionTypeDTO.display_step,
      sessionTypeChannels: sessionTypeDTO.session_type_channels
        ? sessionTypeDTO.session_type_channels.map(channel => this.adaptChannel(channel))
        : [],
      isShopProduct: sessionTypeDTO.is_shop_product,
      targetAttendee: sessionTypeDTO.target_attendee,
      ticketTier: sessionTypeDTO.ticket_tier,
      imageUrl: sessionTypeDTO.image_url ?? null,
      archivedAt: sessionTypeDTO.archived_at ?? null,
    } as SessionType;
  }

  private adaptGroup(sessionTypeGroupDTOs: SessionTypeGroupDTO): SessionTypeGroup {
    return {
      id: sessionTypeGroupDTOs.id,
      name: sessionTypeGroupDTOs.name,
      defaultCapacity: sessionTypeGroupDTOs.default_capacity,
    } as SessionTypeGroup;
  }

  private adaptChannel(sessionTypeChannelDTO: SessionTypeChannelDTO): SessionTypeChannel {
    return {
      sessionTypeId: sessionTypeChannelDTO.session_type_id,
      channelId: sessionTypeChannelDTO.channel_id,
      allowedNumTickets: sessionTypeChannelDTO.allowed_num_tickets,
    } as SessionTypeChannel;
  }
}
