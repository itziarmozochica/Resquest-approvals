import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { PropLabelComponent } from '../../components/prop-label/prop-label.component';
import { BlockOf, EventDetailsProps } from '../../models/block.model';
import { isContractFieldMissing } from '../block-validation.util';
import { EVENT_DETAILS_FIELDS } from './event-details.field-contract';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [TranslateModule, PropLabelComponent],
  selector: 'app-db-event-details-properties',
  standalone: true,
  styleUrl: './event-details-properties.component.scss',
  templateUrl: './event-details-properties.component.html',
})
export class EventDetailsPropertiesComponent {
  readonly block = input.required<BlockOf<'eventDetails'>>();
  readonly disabled = input<boolean>(false);
  readonly highlightMissingMandatory = input<boolean>(false);
  readonly propsChange = output<EventDetailsProps>();

  readonly FIELDS = EVENT_DETAILS_FIELDS;

  set(key: string, value: unknown): void {
    this.propsChange.emit({ ...this.block().props, [key]: value } as EventDetailsProps);
  }

  isMissing(field: string): boolean {
    return this.highlightMissingMandatory() && isContractFieldMissing(EVENT_DETAILS_FIELDS, this.block().props, field);
  }
}
