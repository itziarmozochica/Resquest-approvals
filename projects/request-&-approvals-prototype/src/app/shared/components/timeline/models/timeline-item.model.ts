import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { TagSentiment, TagVariant } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

export type TimelineIconSentiment = 'default' | 'success' | 'failed';
export type TimelineIconSize = 'medium' | 'small';
export type TimelineHeaderLayout = 'default' | 'inline';
export type TimelineIconAnimation = 'none' | 'spin';
export type TimelineDefaultExpandedItem = 'first' | 'last' | 'none';
export type TimelineTagSentiment = TagSentiment;
export type TimelineTagVariant = TagVariant;

export interface TimelineItemModel {
  datetime: string;
  icon: IconProp;
  id: string;
  title: string;
  contentHtml?: string;
  contentTemplateKey?: string;
  description?: string;
  iconAnimation?: TimelineIconAnimation;
  iconSentiment?: TimelineIconSentiment;
  initialExpanded?: boolean;
  tagSentiment?: TimelineTagSentiment;
  tagText?: string;
  tagVariant?: TimelineTagVariant;
}

export interface TimelineA11yLabels {
  collapseDetails: string;
  details: string;
  expandDetails: string;
}

export interface TimelineItemExpandedEvent {
  id: string;
  isExpanded: boolean;
}

export interface TimelineItemExpandedWithContextEvent {
  index: number;
  isExpanded: boolean;
  item: TimelineItemModel;
}
