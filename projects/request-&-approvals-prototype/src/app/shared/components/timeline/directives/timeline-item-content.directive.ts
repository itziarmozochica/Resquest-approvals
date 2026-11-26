import { Directive, inject, input, TemplateRef } from '@angular/core';

import { TimelineItemModel } from '../models/timeline-item.model';

@Directive({
  selector: 'ng-template[timelineItemContent]',
  standalone: true,
})
export class TimelineItemContentDirective {
  readonly contentTemplateKey = input.required<string>({ alias: 'timelineItemContent' });
  readonly templateRef = inject<TemplateRef<{ $implicit: TimelineItemModel }>>(TemplateRef);
}
