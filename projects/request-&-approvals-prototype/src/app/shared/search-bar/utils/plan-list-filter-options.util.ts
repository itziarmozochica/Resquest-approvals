import { TranslateService } from '@ngx-translate/core';

import { PlanFilterOption } from '../../models/plan/plan-filter.model';
import { PlanKind } from '../../models/plan/plan-kind.enum';
import { PlanStatus } from '../../models/plan/plan-status.enum';
import { Permissions } from '../../services/user/permissions';
import { UserService } from '../../services/user/user.service';
import { ReviewStatusFilterDefinition } from './plan-list-search-filters.util';

export interface ReviewStatusFilterOptionDefinition extends ReviewStatusFilterDefinition {
  labelKey: string;
}

export const REVIEWER_STATUS_FILTER_OPTIONS: ReadonlyArray<ReviewStatusFilterOptionDefinition> = [
  { id: 'submitted', labelKey: 'listPlan.reviewStatus.submitted', reviewStatuses: ['submitted'] },
  { id: 'claimed', labelKey: 'listPlan.reviewStatus.claimed', reviewStatuses: ['claimed'] },
];

export const NON_REVIEWER_STATUS_FILTER_OPTIONS: ReadonlyArray<ReviewStatusFilterOptionDefinition> = [
  { id: 'inReview', labelKey: 'listPlan.reviewStatus.inReview', reviewStatuses: ['submitted', 'claimed'] },
];

function toCamelCase(str: string): string {
  return str.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function buildPlanListKindOptions(
  translateService: TranslateService,
  userService: UserService,
  selectAllLabel: string,
): PlanFilterOption[] {
  const kindConfigs: Array<{
    key: string;
    kind: PlanKind;
    permission?: Permissions;
  }> = [
    { key: 'ALL', kind: PlanKind.ALL },
    { key: 'STANDARD', kind: PlanKind.STANDARD },
    { key: 'TIMELESS', kind: PlanKind.TIMELESS },
    { key: 'WAITLIST', kind: PlanKind.WAITLIST, permission: Permissions.CAN_VIEW_WAITLISTS },
    { key: 'AUCTION', kind: PlanKind.AUCTION, permission: Permissions.CAN_VIEW_AUCTIONS },
    { key: 'GIFT_CARD', kind: PlanKind.GIFT_CARD },
    { key: 'GIVEAWAY', kind: PlanKind.GIVEAWAY },
    { key: 'LINK_OUT', kind: PlanKind.LINK_OUT, permission: Permissions.CAN_VIEW_LINK_OUTS },
    { key: 'MOVIE', kind: PlanKind.MOVIE },
    { key: 'PRIZE_DRAW', kind: PlanKind.PRIZE_DRAW, permission: Permissions.CAN_VIEW_PRIZE_DRAWS },
    { key: 'REDEEM_NOW', kind: PlanKind.REDEEM_NOW, permission: Permissions.CAN_VIEW_REDEEM_NOW },
    { key: 'SHOWCASE', kind: PlanKind.SHOWCASE, permission: Permissions.CAN_VIEW_SHOWCASE },
  ];

  return kindConfigs
    .filter(config => !(config.permission && !userService.hasPermission(config.permission)))
    .map(config => {
      const camelCaseKey = toCamelCase(config.key);
      return {
        id: config.kind,
        title: config.key === 'ALL' ? selectAllLabel : translateService.instant(`filters.${camelCaseKey}Events`),
      };
    });
}

export function buildPlanListStatusOptions(translateService: TranslateService, selectAllLabel: string): PlanFilterOption[] {
  return Object.keys(PlanStatus).map((key: string) => ({
    id: PlanStatus[key as keyof typeof PlanStatus],
    title: key === 'ALL' ? selectAllLabel : translateService.instant(`filters.${key.toLowerCase()}Events`),
  }));
}

export function buildPlanListReviewStatusFilterDefinitions(userService: UserService): ReadonlyArray<ReviewStatusFilterOptionDefinition> {
  return userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS)
    ? REVIEWER_STATUS_FILTER_OPTIONS
    : NON_REVIEWER_STATUS_FILTER_OPTIONS;
}

export function buildPlanListReviewStatusOptions(
  translateService: TranslateService,
  definitions: ReadonlyArray<ReviewStatusFilterOptionDefinition>,
): PlanFilterOption[] {
  return definitions.map(option => ({
    id: option.id,
    title: translateService.instant(option.labelKey),
  }));
}
