export const noteAudience = {
  Customer: 'CUSTOMER',
  Internal: 'INTERNAL',
} as const;

export type NoteAudienceET = (typeof noteAudience)[keyof typeof noteAudience];

export const noteAudienceLabelKey: Record<NoteAudienceET, string> = {
  [noteAudience.Customer]: 'boxOffice.order.notes.audienceCustomer',
  [noteAudience.Internal]: 'boxOffice.order.notes.audienceStaff',
};
