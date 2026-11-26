import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { ExpandableRichTextEditorComponent } from '../../components/expandable-rich-text-editor/expandable-rich-text-editor.component';
import { PropLabelComponent } from '../../components/prop-label/prop-label.component';
import { BlockOf, ParagraphProps } from '../../models/block.model';
import { isContractFieldMissing } from '../block-validation.util';
import { PARAGRAPH_FIELDS } from './paragraph.field-contract';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [TranslateModule, ExpandableRichTextEditorComponent, PropLabelComponent],
  selector: 'app-db-paragraph-properties',
  standalone: true,
  styleUrl: './paragraph-properties.component.scss',
  templateUrl: './paragraph-properties.component.html',
})
export class ParagraphPropertiesComponent {
  readonly block = input.required<BlockOf<'paragraph'>>();
  readonly disabled = input<boolean>(false);
  readonly highlightMissingMandatory = input<boolean>(false);
  readonly propsChange = output<ParagraphProps>();

  readonly FIELDS = PARAGRAPH_FIELDS;

  setText(value: string): void {
    this.propsChange.emit({ ...this.block().props, text: value });
  }

  isMissing(field: string): boolean {
    return this.highlightMissingMandatory() && isContractFieldMissing(PARAGRAPH_FIELDS, this.block().props, field);
  }
}
