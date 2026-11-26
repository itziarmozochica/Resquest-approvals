import { TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

/** Chip shape rendered by `TagListWithOverflowComponent`. Structurally compatible with any `{ labelKey, sentiment }` tag model. */
export interface TagListItem {
  readonly labelKey: string;
  readonly sentiment: TagSentiment;
}
