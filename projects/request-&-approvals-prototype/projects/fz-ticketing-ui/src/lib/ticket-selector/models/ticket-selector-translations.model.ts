export interface FztTicketSelectorTranslations {
  addOns?: string;
  available?: string;
  breadcrumbBackAriaLabel?: string;
  breadcrumbHomeAriaLabel?: string;
  hiddenTicketBadge?: string;
  hiddenTicketsSection?: string;
  memberDiscountLabel?: string;
  multiDayUntil?: string;
  originalPriceAriaLabel?: string;
  outOfStock?: string;
  pageDotAriaLabel?: string;
  partyNoActivitiesDescription?: string;
  partyNoActivitiesTitle?: string;
  partyNoTimeSlotsLeft?: string;
  partySelectMembersCta?: string;
  partySelectMembersDescription?: string;
  partySelectMembersHandheldDescription?: string;
  partySelectMembersHandheldTitle?: string;
  partySelectMembersTitle?: string;
  seating?: string;
  taxesIncluded?: string;
  ticketsAndAddOns?: string;
  today?: string;
  tomorrow?: string;
  unavailable?: string;
  yesterday?: string;
}

export type ResolvedFztTicketSelectorTranslations = Required<FztTicketSelectorTranslations>;

export type FztTabLabelKey = 'addOns' | 'seating' | 'ticketsAndAddOns';
