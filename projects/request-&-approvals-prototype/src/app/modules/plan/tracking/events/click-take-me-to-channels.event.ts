import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ClickTakeMeToChannelsData {
  plan_id: number;
}

export const clickTakeMeToChannels = defineEvent<ClickTakeMeToChannelsData>('click.takeMeToChannels');
