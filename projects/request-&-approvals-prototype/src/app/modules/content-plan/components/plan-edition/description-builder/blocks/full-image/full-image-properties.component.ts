import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { LocalImageUploadComponent } from '../../components/local-image-upload/local-image-upload.component';
import { PropLabelComponent } from '../../components/prop-label/prop-label.component';
import { BlockOf, FullImageProps } from '../../models/block.model';
import { isContractFieldMissing } from '../block-validation.util';
import { FULL_IMAGE_FIELDS } from './full-image.field-contract';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [TranslateModule, LocalImageUploadComponent, PropLabelComponent],
  selector: 'app-db-full-image-properties',
  standalone: true,
  styleUrl: './full-image-properties.component.scss',
  templateUrl: './full-image-properties.component.html',
})
export class FullImagePropertiesComponent {
  readonly block = input.required<BlockOf<'fullImage'>>();
  readonly uploadImageCallback = input.required<(file: File) => Observable<string>>();
  readonly disabled = input<boolean>(false);
  readonly highlightMissingMandatory = input<boolean>(false);
  readonly propsChange = output<FullImageProps>();

  readonly FIELDS = FULL_IMAGE_FIELDS;

  setSrc(value: string): void {
    this.propsChange.emit({ ...this.block().props, src: value });
  }

  isMissing(field: string): boolean {
    return this.highlightMissingMandatory() && isContractFieldMissing(FULL_IMAGE_FIELDS, this.block().props, field);
  }
}
