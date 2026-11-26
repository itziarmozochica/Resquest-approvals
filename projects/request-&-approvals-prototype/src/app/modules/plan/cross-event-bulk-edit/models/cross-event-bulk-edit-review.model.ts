export const crossEventBulkEditEventsListPath = '/plans';
export const crossEventBulkEditReviewTitleMany = 'listPlan.crossEventBulkEdit.review.title';
export const crossEventBulkEditReviewTitleOneEvent = 'listPlan.crossEventBulkEdit.review.titleOneEvent';
export const crossEventBulkEditReviewTitleOneTicketType = 'listPlan.crossEventBulkEdit.review.titleOneTicketType';
export const crossEventBulkEditReviewTitleOneTicketTypeOneEvent = 'listPlan.crossEventBulkEdit.review.titleOneTicketTypeOneEvent';

export interface CrossEventBulkEditPlanSessionTypes {
  planId: number;
  sessionTypeIds: readonly number[];
}

export interface CrossEventBulkEditReviewTicketType {
  caption: string;
  groupName: string;
  label: string;
}
