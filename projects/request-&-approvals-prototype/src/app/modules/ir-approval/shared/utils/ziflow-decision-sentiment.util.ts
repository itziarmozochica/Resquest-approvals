export type ZiflowDecisionSentiment = 'positive' | 'danger' | 'warning' | 'neutral';

const SENTIMENT_BY_DECISION: Record<string, ZiflowDecisionSentiment> = {
  approved: 'positive',
  changes_required: 'danger',
  withdrawn: 'warning',
};

/** The colour a Ziflow decision reads in, shared by the approval item and the change history. */
export function ziflowDecisionSentiment(decision: string | undefined): ZiflowDecisionSentiment {
  return (decision && SENTIMENT_BY_DECISION[decision.toLowerCase()]) || 'neutral';
}
