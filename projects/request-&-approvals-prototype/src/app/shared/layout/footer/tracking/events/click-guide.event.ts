import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ClickGuideData {
  time: string;
}

export const clickGuide = defineEvent<ClickGuideData>('click.guide');
