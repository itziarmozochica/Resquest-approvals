import { ChangeDetectionStrategy, Component, computed, input, type InputSignal, type Signal } from '@angular/core';

import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import type { IndividualAgreementStatus } from '../../../enums/individual-agreement-status.enum';
import { getAgreementStatusTag, type AgreementStatusTag } from '../../utils/agreement-status-tag.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTagComponent, TranslateModule],
  selector: 'app-agreement-status-tag',
  standalone: true,
  templateUrl: './agreement-status-tag.component.html',
})
export class AgreementStatusTagComponent {
  readonly status: InputSignal<IndividualAgreementStatus> = input.required<IndividualAgreementStatus>();

  protected readonly tag: Signal<AgreementStatusTag> = computed(() => getAgreementStatusTag(this.status()));
}
