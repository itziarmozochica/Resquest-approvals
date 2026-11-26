import { Component, Input, ViewEncapsulation } from '@angular/core';

import { IgntTagComponent, TagSentiment, TagVariant } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import { PlanRequestStatus } from '../../../modules/plan/plan-request/models/plan-request/plan-request-status.enum';
import { PlanStatus } from '../../models/plan/plan-status.enum';
import { TagType } from './model/tag-type';

@Component({
  selector: 'app-plan-status-tag',
  templateUrl: './plan-status-tag.component.html',
  styleUrls: ['./plan-status-tag.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [IgntTagComponent, TranslateModule],
})
export class PlanStatusTagComponent {
  @Input() isHidden = false;
  sentimentTag: { [key: string]: TagSentiment } = {
    [PlanStatus.ON_SALE]: 'positive',
    [PlanStatus.OFF_SALE]: 'disable',
    [PlanStatus.DRAFT]: 'disable',
    [PlanStatus.ALL]: 'positive',
    [PlanRequestStatus.TO_BE_SUBMITTED]: 'warning',
    [PlanRequestStatus.SUBMITTED]: 'warning',
    [PlanRequestStatus.ACCEPTED]: 'positive',
    [PlanRequestStatus.REJECTED]: 'danger',
  } as const;
  @Input() status = '';
  @Input() style!: TagVariant;
  tagText: { [key: string]: string } = {
    [PlanStatus.ON_SALE]: 'filters.on_saleEvents',
    [PlanStatus.OFF_SALE]: 'filters.off_saleEvents',
    [PlanStatus.DRAFT]: 'filters.draftEvents',
    [PlanStatus.ALL]: 'filters.allEvents',
    [PlanRequestStatus.TO_BE_SUBMITTED]: 'filters.toBeSubmitted',
    [PlanRequestStatus.SUBMITTED]: 'filters.submitted',
    [PlanRequestStatus.ACCEPTED]: 'filters.accepted',
    [PlanRequestStatus.REJECTED]: 'filters.rejected',
  } as const;
  @Input() type: TagType = TagType.STATUS;
}
