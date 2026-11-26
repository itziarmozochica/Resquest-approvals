import { Component, Input } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { TagSentiment, TagVariant } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

interface LabelConfig {
  text: string;
  icon?: [string, string];
  classModifier: string;
}

export type LabelType =
  | 'singleTicketType'
  | 'multipleTicketType'
  | 'friend-to-friend'
  | 'expired'
  | 'resale'
  | 'reschedule-transition'
  | 'reschedule-new'
  | 'reschedule-original';

export const ValidationLabels: Record<LabelType, LabelConfig> = {
  singleTicketType: {
    text: 'validateTicketsNew.labels.singleTicketType',
    icon: ['fal', 'ticket-alt'],
    classModifier: 'single-ticket-type',
  } as LabelConfig,
  multipleTicketType: {
    text: 'validateTicketsNew.labels.multipleTicketType',
    icon: ['fal', 'ticket-alt'],
    classModifier: 'multiple-ticket-type',
  } as LabelConfig,
  'friend-to-friend': {
    text: 'validateTicketsNew.labels.transferred',
    icon: ['fal', 'ticket-alt'],
    classModifier: 'transferred',
  } as LabelConfig,
  expired: {
    text: 'validateTicketsNew.labels.expired',
    icon: ['far', 'clock'],
    classModifier: 'expired',
  } as LabelConfig,
  resale: {
    text: 'validateTicketsNew.labels.resale',
    icon: ['fal', 'ticket-alt'],
    classModifier: 'resale',
  } as LabelConfig,
  'reschedule-transition': {
    text: 'validateTicketsNew.labels.rescheduleTransitionOrder',
    classModifier: 'reschedule-transition-order',
  } as LabelConfig,
  'reschedule-new': {
    text: 'validateTicketsNew.labels.rescheduleNewOrder',
    classModifier: 'reschedule-new-order',
  } as LabelConfig,
  'reschedule-original': {
    text: 'validateTicketsNew.labels.rescheduleOriginalOrder',
    classModifier: 'reschedule-original-order',
  } as LabelConfig,
};

@Component({
  selector: 'app-validation-label',
  standalone: false,
  templateUrl: './validation-label.component.html',
  styleUrls: ['./validation-label.component.scss'],
})
export class ValidationLabelComponent {
  @Input() set label(value: LabelType) {
    this.selectedConfig = ValidationLabels[value];
  }

  selectedConfig?: LabelConfig;
  sentimentTag: { [key: string]: TagSentiment } = {
    'single-ticket-type': 'warning',
    'multiple-ticket-type': 'info',
    'friend-to-friend': 'accent',
    expired: 'sharp',
    resale: 'danger',
    'reschedule-transition-order': 'warning',
    'reschedule-new-order': 'positive',
    'reschedule-original-order': 'info',
  } as const;

  tagVariant: { [key: string]: TagVariant } = {
    'single-ticket-type': 'outline',
    'multiple-ticket-type': 'outline',
    'friend-to-friend': 'outline',
    expired: 'outline',
    resale: 'outline',
    'reschedule-transition-order': 'solid',
    'reschedule-new-order': 'solid',
    'reschedule-original-order': 'solid',
  } as const;

  selectedIcon(): IconProp {
    return this.selectedConfig?.icon as IconProp;
  }
}
