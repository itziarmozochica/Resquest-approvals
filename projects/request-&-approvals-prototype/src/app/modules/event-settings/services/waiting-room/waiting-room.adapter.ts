import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../../shared/models/base-response';
import {
  waitingRoomDetailsInvalidFieldMessagePrefix,
  waitingRoomDetailsNumberFieldKeys,
  waitingRoomDetailsStringFieldKeys,
} from './waiting-room-details.constants';
import type {
  CreateWaitingRoomBody,
  CreateWaitingRoomInput,
  UpdateOutflowResponseData,
  UpdateOutflowResult,
  WaitingRoomDetails,
  WaitingRoomDetailsResponse,
} from './waiting-room.service.types';

@Injectable({
  providedIn: 'root',
})
export class WaitingRoomAdapter implements AdapterInterface<WaitingRoomDetails, BaseResponse<WaitingRoomDetailsResponse>> {
  fromApi(response: BaseResponse<WaitingRoomDetailsResponse>): WaitingRoomDetails {
    const { data } = response;

    if (!data) {
      throw new Error('No data received from waiting room details API');
    }

    const {
      channel_id,
      language,
      launching_datetime,
      max_outflow,
      minutes_in_pre_queue,
      plan_max_outflow,
      plan_type,
      timezone,
      visibility_mode,
      waiting_room_name,
    } = data;

    const details: WaitingRoomDetails = {
      channelId: channel_id,
      language,
      launchingDatetime: launching_datetime,
      maxOutflow: max_outflow,
      minutesInPreQueue: minutes_in_pre_queue,
      planMaxOutflow: plan_max_outflow,
      planType: plan_type,
      timezone,
      visibilityMode: visibility_mode,
      waitingRoomName: waiting_room_name,
    };

    this.#assertWaitingRoomDetailsShape(details);

    return details;
  }

  fromUpdateOutflowResult(data: UpdateOutflowResponseData): UpdateOutflowResult {
    return { maxOutflow: data.max_outflow };
  }

  toCreateBody(input: CreateWaitingRoomInput): CreateWaitingRoomBody {
    const { channelId, language, launchingDatetime, mainPlanId, minutesInPreQueue, timezone, visibilityMode, waitingRoomName } = input;

    return {
      channel_id: channelId,
      language,
      launching_datetime: launchingDatetime,
      main_plan_id: mainPlanId,
      minutes_in_pre_queue: minutesInPreQueue,
      timezone,
      visibility_mode: visibilityMode,
      waiting_room_name: waitingRoomName,
    };
  }

  #assertWaitingRoomDetailsShape(details: WaitingRoomDetails): void {
    for (const key of waitingRoomDetailsStringFieldKeys) {
      const value = details[key];
      const isValueNotAString = typeof value !== 'string';

      if (isValueNotAString) {
        throw new Error(`${waitingRoomDetailsInvalidFieldMessagePrefix}${key}`);
      }
    }

    for (const key of waitingRoomDetailsNumberFieldKeys) {
      const value = details[key];
      const isInvalid = typeof value !== 'number' || !Number.isFinite(value);

      if (isInvalid) {
        throw new Error(`${waitingRoomDetailsInvalidFieldMessagePrefix}${key}`);
      }
    }
  }
}
