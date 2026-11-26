import { ZiflowDecisionSentiment } from '../utils/ziflow-decision-sentiment.util';

export interface FlatRow {
  field: string;
  before: string;
  after: string;
}

export interface ClippedCell {
  text: string;
  full?: string;
}

export interface DisplayRow {
  field: string;
  before: ClippedCell;
  after: ClippedCell;
}

export interface ItemChangeRow {
  label: ClippedCell;
  fromStatus: string;
  toStatus: string;
  editedAt: string;
  changedBy: string;
}

export interface ActivityRow {
  decision: string;
  decisionSentiment: ZiflowDecisionSentiment;
  asset: ClippedCell;
  decidedAt: string;
}
