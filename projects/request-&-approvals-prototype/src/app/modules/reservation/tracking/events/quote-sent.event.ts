import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { LeadQuoteSendSource } from '../../leads/enums/lead-quote-send-source.enum';

export interface QuoteSentData {
  /** Whether the quote had already been emailed before this send. */
  isResend: boolean;
  leadId: string;
  quoteId: string;
  /** Where the agent sent it from: the quote's Send button on the lead, or Create and send in the wizard. */
  source: LeadQuoteSendSource;
}

export const quoteSent = defineEvent<QuoteSentData>('quote.sent');
