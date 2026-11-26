/** The till lock link kept across logouts, tied to the onsite setup it was resolved for. */
export interface StoredOdooTillLockLink {
  channelId: string;
  link: string;
  onsiteSetupId: string | null;
}
