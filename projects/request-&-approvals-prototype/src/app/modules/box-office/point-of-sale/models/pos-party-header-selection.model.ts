/** What the handheld header shows once a party is picked: "Jun 17 12:00" and the party size. */
export interface PosPartyHeaderSelection {
  readonly dateLabel: string;
  readonly hourLabel: string;
  readonly partySize: number;
}

export interface PosPartyHeaderSelectionParams {
  readonly hourFilter: string | null;
  readonly isPartyMembersMode: boolean;
  readonly locale: string;
  readonly nowLabel: string;
  readonly quantities: Readonly<Record<string, number>>;
  readonly selectedDate: string | null;
  readonly timeZone: string;
}
