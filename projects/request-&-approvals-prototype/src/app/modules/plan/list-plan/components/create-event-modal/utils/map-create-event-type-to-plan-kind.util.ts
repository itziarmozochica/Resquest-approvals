import { PlanKind } from '@fz-original/app/shared/models/plan/plan-kind.enum';

import { CreateEventType } from '../create-event.model';

const CREATE_EVENT_TYPE_TO_PLAN_KIND = {
  auction: PlanKind.AUCTION,
  gift_card: PlanKind.GIFT_CARD,
  giveaway: PlanKind.GIVEAWAY,
  link_out: PlanKind.LINK_OUT,
  movie: PlanKind.MOVIE,
  prize_draw: PlanKind.PRIZE_DRAW,
  redeem_now: PlanKind.REDEEM_NOW,
  showcase: PlanKind.SHOWCASE,
  standard: PlanKind.STANDARD,
  waitlist: PlanKind.WAITLIST,
} satisfies Record<CreateEventType, PlanKind>;

export function mapCreateEventTypeToPlanKind(eventType: CreateEventType): PlanKind {
  return CREATE_EVENT_TYPE_TO_PLAN_KIND[eventType];
}
