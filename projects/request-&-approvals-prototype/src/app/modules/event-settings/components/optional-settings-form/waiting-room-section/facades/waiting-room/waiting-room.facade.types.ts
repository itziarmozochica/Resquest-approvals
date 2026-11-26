import type { WaitingRoomFormGroup } from '../../waiting-room-section.types';

export interface WaitingRoomLoadInputs {
  channelId: string;
  form: WaitingRoomFormGroup;
  partnerId: number | null;
  planId: number | null;
}

export type ChannelFormInputs = Pick<WaitingRoomLoadInputs, 'channelId' | 'form'>;

export type PartnerPlanInputs = Pick<WaitingRoomLoadInputs, 'partnerId' | 'planId'>;

export interface WaitingRoomPlanInfo {
  planType: string;
  planMaxOutflow: number;
}
