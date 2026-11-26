import type { BaseResponse } from '@fz/http-models';

import type {
  EvaluateCapabilityPayload,
  EvaluateReservationCapabilityApi,
  EvaluateReservationCapabilityResponse,
} from '../models/evaluate-reservation-capability.model';

export interface EvaluateCapabilityBody {
  channel_id?: string;
}

export function adaptEvaluateReservationCapability(
  response: BaseResponse<EvaluateReservationCapabilityApi>,
): EvaluateReservationCapabilityResponse | null {
  return adaptData(response.data);
}

export function toEvaluateCapabilityBody(payload: EvaluateCapabilityPayload): EvaluateCapabilityBody {
  return { ...(payload.channelId !== undefined && payload.channelId !== '' && { channel_id: payload.channelId }) };
}

function adaptData(data: EvaluateReservationCapabilityApi | null | undefined): EvaluateReservationCapabilityResponse | null {
  if (data === null || data === undefined) {
    return null;
  }
  return {
    capable: data.capable,
    ...(data.violations !== undefined && { violations: data.violations }),
  };
}
