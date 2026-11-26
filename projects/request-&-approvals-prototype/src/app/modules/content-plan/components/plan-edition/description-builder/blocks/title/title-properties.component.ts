import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { PropLabelComponent } from '../../components/prop-label/prop-label.component';
import { BlockOf, TitleProps } from '../../models/block.model';
import { isContractFieldMissing } from '../block-validation.util';
import { TITLE_FIELDS } from './title.field-contract';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `None` matches the properties-panel dispatcher: the shared `.prop*` form
  // styles live there and cascade into this section.
  encapsulation: ViewEncapsulation.None,
  imports: [TranslateModule, PropLabelComponent],
  selector: 'app-db-title-properties',
  standalone: true,
  styleUrl: './title-properties.component.scss',
  templateUrl: './title-properties.component.html',
})
export class TitlePropertiesComponent {
  readonly block = input.required<BlockOf<'title'>>();
  readonly disabled = input<boolean>(false);
  readonly highlightMissingMandatory = input<boolean>(false);
  readonly propsChange = output<TitleProps>();

  readonly FIELDS = TITLE_FIELDS;

  set(key: string, value: unknown): void {
    this.propsChange.emit({ ...this.block().props, [key]: value } as TitleProps);
  }

  isMissing(field: string): boolean {
    return this.highlightMissingMandatory() && isContractFieldMissing(TITLE_FIELDS, this.block().props, field);
  }
}
