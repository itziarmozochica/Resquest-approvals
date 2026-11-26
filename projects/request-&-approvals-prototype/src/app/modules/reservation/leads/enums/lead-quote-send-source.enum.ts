/** Where the agent sent a quote from. Tracked with every send, and it decides how a failed send is worded. */
export enum LeadQuoteSendSource {
  LeadDetail = 'lead_detail',
  Wizard = 'wizard',
}
