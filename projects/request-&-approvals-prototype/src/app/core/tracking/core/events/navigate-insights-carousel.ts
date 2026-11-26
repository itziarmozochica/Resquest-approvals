import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export const CarouselDirection = {
  next: 'next',
  previous: 'previous',
} as const;

export type CarouselDirectionET = (typeof CarouselDirection)[keyof typeof CarouselDirection];

export const InsightsCarouselType = {
  negative: 'negative',
  positive: 'positive',
} as const;

export type InsightsCarouselTypeET = (typeof InsightsCarouselType)[keyof typeof InsightsCarouselType];

export interface NavigateInsightsCarouselData {
  carousel_type: InsightsCarouselTypeET;
  direction: CarouselDirectionET;
  from_index: number;
  plan_id: number;
  to_index: number;
  total_insights: number;
}

export class NavigateInsightsCarouselEvent extends TrackingEvent<NavigateInsightsCarouselData> {
  constructor(readonly data: NavigateInsightsCarouselData) {
    super(TrackingEvents.NavigateInsightsCarousel, data);
  }
}
