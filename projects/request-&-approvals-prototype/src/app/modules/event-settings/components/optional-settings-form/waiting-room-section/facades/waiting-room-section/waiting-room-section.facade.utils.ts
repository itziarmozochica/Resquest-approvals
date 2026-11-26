import { ChannelFormInputs, PartnerPlanInputs, WaitingRoomLoadInputs } from '../waiting-room/waiting-room.facade.types';

export function canStartWaitingRoomLoad(inputs: ChannelFormInputs): boolean {
  const { channelId, form } = inputs;

  return channelId.length > 0 && !!form;
}

export function isAwaitingPartnerOrPlanContext(inputs: PartnerPlanInputs): boolean {
  const { partnerId, planId } = inputs;

  return partnerId == null || planId == null;
}

export function isSameWaitingRoomLoadKey(prev: WaitingRoomLoadInputs, curr: WaitingRoomLoadInputs): boolean {
  const { channelId: prevChannelId, partnerId: prevPartnerId = null, planId: prevPlanId = null } = prev;
  const { channelId: currChannelId, partnerId: currPartnerId = null, planId: currPlanId = null } = curr;

  const sameChannelId = prevChannelId === currChannelId;
  const samePartnerId = prevPartnerId === currPartnerId;
  const samePlanId = prevPlanId === currPlanId;

  return sameChannelId && samePartnerId && samePlanId;
}
