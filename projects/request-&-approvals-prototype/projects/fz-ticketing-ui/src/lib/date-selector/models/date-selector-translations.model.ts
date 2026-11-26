export interface FztDateSelectorTranslations {
  afternoon?: string;
  afternoonHours?: string;
  clearPartyMembersLabel?: string;
  decreasePartyMemberAriaLabel?: string;
  evening?: string;
  eveningHours?: string;
  increasePartyMemberAriaLabel?: string;
  loadMoreAriaLabel?: string;
  morning?: string;
  morningHours?: string;
  night?: string;
  nightHours?: string;
  noSessionsAvailable?: string;
  now?: string;
  selectADate?: string;
  selectPartyMembersLabel?: string;
  selectTheDateLabel?: string;
  sellingTicketsFor?: string;
  showAvailabilityFromLabel?: string;
  today?: string;
  toggleRangeAriaLabel?: string;
  tomorrow?: string;
}

export type ResolvedFztDateSelectorTranslations = Required<FztDateSelectorTranslations>;

/** Translations key of a day-part hour-range caption, so the view-model can name one without carrying copy. */
export type FztDayPartHoursCaptionKey = 'afternoonHours' | 'eveningHours' | 'morningHours' | 'nightHours';
