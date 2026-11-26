export type ApprovalCategory = 'event' | 'marketing';

export interface ApprovalCategoryOption {
  value: ApprovalCategory;
  subtypes: ReadonlyArray<string>;
  // When true, each subtype is offered as a top-level type card and the dedicated
  // subtype step is skipped (B12: event approvals go straight to URL entry).
  selectSubtypeAtType?: boolean;
}

// marketing approvals are the five marketing subtypes. The `category` is a frontend-only
// grouping; only `subtype` is meaningful to the backend template-key resolution.
export const APPROVAL_CATEGORY_OPTIONS: ReadonlyArray<ApprovalCategoryOption> = [
  { value: 'event', subtypes: ['event'], selectSubtypeAtType: true },
  {
    value: 'marketing',
    subtypes: ['marketing_landings', 'crm_campaign', 'marketing_copy', 'marketing_asset', 'marketing_secret_media'],
  },
];

export function subtypesForCategory(category: string): ReadonlyArray<string> {
  return APPROVAL_CATEGORY_OPTIONS.find(option => option.value === category)?.subtypes ?? [];
}

export function categorySelectsSubtypeAtType(category: string): boolean {
  return APPROVAL_CATEGORY_OPTIONS.find(option => option.value === category)?.selectSubtypeAtType ?? false;
}

// A type-step card. For categories that pick their subtype up-front (events),
// each subtype becomes its own card; other categories surface a single card
// and keep their dedicated subtype step.
export interface ApprovalTypeOption {
  id: string;
  category: ApprovalCategory;
  subtype: string | null;
}

export const APPROVAL_TYPE_OPTIONS: ReadonlyArray<ApprovalTypeOption> = APPROVAL_CATEGORY_OPTIONS.flatMap<ApprovalTypeOption>(option =>
  option.selectSubtypeAtType
    ? option.subtypes.map(subtype => ({ id: subtype, category: option.value, subtype }))
    : [{ id: option.value, category: option.value, subtype: null }],
);

export type MarketingRequestLink = 'general' | 'specific' | 'none';

export const MARKETING_REQUEST_LINK_OPTIONS: ReadonlyArray<MarketingRequestLink> = ['general', 'specific', 'none'];
