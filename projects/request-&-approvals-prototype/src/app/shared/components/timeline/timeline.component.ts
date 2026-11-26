import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChildren, input, output, TemplateRef } from '@angular/core';

import { TimelineItemComponent } from '../timeline-item/timeline-item.component';
import { TimelineItemContentDirective } from './directives/timeline-item-content.directive';
import {
  TimelineA11yLabels,
  TimelineDefaultExpandedItem,
  TimelineIconSize,
  TimelineItemExpandedEvent,
  TimelineItemExpandedWithContextEvent,
  TimelineItemModel,
} from './models/timeline-item.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, TimelineItemComponent],
  selector: 'app-shared-timeline',
  standalone: true,
  styleUrls: ['./timeline.component.scss'],
  templateUrl: './timeline.component.html',
})
export class TimelineComponent {
  readonly a11yLabels = input<Partial<TimelineA11yLabels>>({});
  readonly dateFormat = input<string>('L - LT');
  readonly dateLocale = input<string>('en');
  readonly defaultExpandedItem = input<TimelineDefaultExpandedItem>('last');
  readonly iconFramed = input<boolean>(true);
  readonly iconSize = input<TimelineIconSize>('medium');
  readonly items = input<TimelineItemModel[]>([]);

  readonly itemTemplates = contentChildren(TimelineItemContentDirective);

  readonly itemExpanded = output<TimelineItemExpandedWithContextEvent>();

  getInitialExpanded(isFirst: boolean, isLast: boolean): boolean {
    const defaultExpandedItem = this.defaultExpandedItem();

    if (defaultExpandedItem === 'first') {
      return isFirst;
    }

    if (defaultExpandedItem === 'none') {
      return false;
    }

    return isLast;
  }

  getItemTemplate(contentTemplateKey?: string): TemplateRef<{ $implicit: TimelineItemModel }> | undefined {
    if (!contentTemplateKey) {
      return undefined;
    }

    return this.itemTemplates()?.find(t => t.contentTemplateKey() === contentTemplateKey)?.templateRef;
  }

  onItemExpanded(event: TimelineItemExpandedEvent, item: TimelineItemModel, index: number): void {
    this.itemExpanded.emit({ item, index, isExpanded: event.isExpanded });
  }
}
