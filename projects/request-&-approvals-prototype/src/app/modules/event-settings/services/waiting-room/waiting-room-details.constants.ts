export const waitingRoomDetailsInvalidFieldMessagePrefix = 'Waiting room details response missing or invalid field: ';

export const waitingRoomDetailsStringFieldKeys = [
  'channelId',
  'language',
  'launchingDatetime',
  'planType',
  'timezone',
  'visibilityMode',
  'waitingRoomName',
] as const;

export const waitingRoomDetailsNumberFieldKeys = ['maxOutflow', 'minutesInPreQueue', 'planMaxOutflow'] as const;
