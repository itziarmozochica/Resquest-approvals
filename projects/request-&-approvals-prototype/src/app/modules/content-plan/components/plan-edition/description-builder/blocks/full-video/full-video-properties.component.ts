import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { LocalImageUploadComponent } from '../../components/local-image-upload/local-image-upload.component';
import { PropLabelComponent } from '../../components/prop-label/prop-label.component';
import { BlockOf, FullVideoProps } from '../../models/block.model';
import { isContractFieldMissing } from '../block-validation.util';
import { FULL_VIDEO_FIELDS } from './full-video.field-contract';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [TranslateModule, LocalImageUploadComponent, PropLabelComponent],
  selector: 'app-db-full-video-properties',
  standalone: true,
  styleUrl: './full-video-properties.component.scss',
  templateUrl: './full-video-properties.component.html',
})
export class FullVideoPropertiesComponent {
  readonly block = input.required<BlockOf<'fullVideo'>>();
  readonly uploadImageCallback = input.required<(file: File) => Observable<string>>();
  readonly disabled = input<boolean>(false);
  readonly highlightMissingMandatory = input<boolean>(false);
  readonly propsChange = output<FullVideoProps>();

  readonly FIELDS = FULL_VIDEO_FIELDS;

  setSrc(value: string): void {
    this.propsChange.emit({ ...this.block().props, src: value });
  }

  isMissing(field: string): boolean {
    return this.highlightMissingMandatory() && isContractFieldMissing(FULL_VIDEO_FIELDS, this.block().props, field);
  }
}
