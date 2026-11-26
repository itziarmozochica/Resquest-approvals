import { TagSentiment } from '@ignite/common';

export interface RequestStatusVm {
  labelKey: string;
  slug: string;
  sentiment: TagSentiment;
}
