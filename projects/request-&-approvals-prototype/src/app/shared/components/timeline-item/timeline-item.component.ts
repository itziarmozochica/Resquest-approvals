import { NgTemplateOutlet } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  input,
  output,
  signal,
  TemplateRef,
  WritableSignal,
} from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import moment from 'moment-timezone';

import {
  TimelineA11yLabels,
  TimelineHeaderLayout,
  TimelineIconAnimation,
  TimelineIconSentiment,
  TimelineIconSize,
  TimelineItemExpandedEvent,
  TimelineTagSentiment,
  TimelineTagVariant,
} from '../timeline/models/timeline-item.model';

const defaultA11yLabels: TimelineA11yLabels = {
  collapseDetails: 'Collapse details',
  details: 'Activity details',
  expandDetails: 'Expand details',
};

const defaultIcon: IconProp = ['fal', 'question-circle'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FontAwesomeModule, IgntIconButtonComponent, IgntTagComponent, NgTemplateOutlet],
  selector: 'app-shared-timeline-item',
  standalone: true,
  styleUrls: ['./timeline-item.component.scss'],
  templateUrl: './timeline-item.component.html',
})
export class TimelineItemComponent implements AfterContentInit {
  #lastInitialExpanded = signal<boolean | undefined>(undefined);

  readonly id = input.required<string>();
  readonly a11yLabels = input<Partial<TimelineA11yLabels>>({});
  readonly contentHtml = input<string>('');
  readonly dateFormat = input<string>('L - LT');
  readonly dateLocale = input<string>('en');
  readonly datetime = input<string>('');
  readonly description = input<string>('');
  readonly descriptionLineClamp = input<number | null>(null);
  readonly headerLayout = input<TimelineHeaderLayout>('default');
  readonly icon = input<IconProp>(defaultIcon);
  readonly iconAnimation = input<TimelineIconAnimation>('none');
  readonly iconFramed = input<boolean>(true);
  readonly iconSentiment = input<TimelineIconSentiment>('default');
  readonly iconSize = input<TimelineIconSize>('medium');
  readonly initialExpanded = input<boolean>(false);
  readonly showConnectorBelow = input<boolean>(false);
  readonly showIcon = input<boolean>(true);
  readonly tagSentiment = input<TimelineTagSentiment>('positive');
  readonly tagText = input<string>('');
  readonly tagVariant = input<TimelineTagVariant>('solid');
  readonly timezone = input<string | null>(null);
  readonly title = input<string>('');

  readonly expandedTemplate = contentChild<TemplateRef<unknown>>('expandedContent');
  readonly headerActionsTemplate = contentChild<TemplateRef<unknown>>('headerActions');

  isExpanded: WritableSignal<boolean> = signal<boolean>(false);

  readonly expanded = output<TimelineItemExpandedEvent>();

  readonly ariaControlsId = computed<string>(() => `timeline-item-content-${this.id()}`);
  readonly ariaTitleId = computed<string>(() => `timeline-item-title-${this.id()}`);
  readonly formattedDate = computed<string>(() => {
    const dateValue = this.datetime();
    if (!dateValue) return '';
    const parsedDate = moment(dateValue);
    if (!parsedDate.isValid()) {
      return '';
    }
    const timezone = this.timezone();
    const zonedDate = timezone ? parsedDate.tz(timezone) : parsedDate;
    return zonedDate.locale(this.dateLocale()).format(this.dateFormat());
  });
  readonly isDescriptionClamped = computed<boolean>(() => this.descriptionLineClamp() !== null && !this.isExpanded());
  readonly iconContainerClass = computed<string>(() => {
    const sentiment = this.iconSentiment();
    const animation = this.iconAnimation();
    const classes = ['timeline-item__icon-container'];
    if (this.iconFramed()) {
      classes.push('timeline-item__icon-container--framed');
    }
    if (sentiment !== 'default') {
      classes.push(`timeline-item__icon-container--${sentiment}`);
    }
    if (animation === 'spin') {
      classes.push('timeline-item__icon-container--spin');
    }
    if (this.iconSize() === 'small') {
      classes.push('timeline-item__icon-container--small');
    }
    return classes.join(' ');
  });
  readonly mergedA11yLabels = computed<TimelineA11yLabels>(() => ({
    ...defaultA11yLabels,
    ...this.a11yLabels(),
  }));
  readonly hasExpandableContent = computed<boolean>(() => Boolean(this.expandedTemplate()) || Boolean(this.contentHtml().trim()));
  readonly renderedContent = computed<string>(() => this.contentHtml());

  constructor() {
    effect(() => {
      const initial = this.initialExpanded();
      const prev = this.#lastInitialExpanded();
      this.#lastInitialExpanded.set(initial);

      if (prev === true && initial === false && this.isExpanded()) {
        this.isExpanded.set(false);
      }
    });
  }

  ngAfterContentInit(): void {
    this.isExpanded.set(this.initialExpanded() && this.hasExpandableContent());
  }

  toggleExpanded(): void {
    if (!this.hasExpandableContent()) {
      return;
    }

    const newExpandedState = !this.isExpanded();
    this.isExpanded.set(newExpandedState);
    this.expanded.emit({ id: this.id(), isExpanded: newExpandedState });
  }
}
