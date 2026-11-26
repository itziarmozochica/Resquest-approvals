import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, Signal } from '@angular/core';

import { LocalImageUploadComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/components/local-image-upload/local-image-upload.component';
import { RICH_TEXT_EDITOR_BLOCK_BODY_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { TranslationTextFieldComponent } from '@fz-original/app/shared/components/translation-text-field/translation-text-field.component';
import { IgntAlertComponent, IgntButtonComponent, IgntColorPickerComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { DescriptionField } from '../../models/description-translation.model';
import {
  canValidateDescriptionField,
  descriptionFieldCountsInTotal,
  isDescriptionFieldTranslated,
} from '../../utils/description-translation.adapter';

export type DescriptionFieldIndicator = 'check' | 'warning' | 'none';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    TranslateModule,
    TranslationTextFieldComponent,
    LocalImageUploadComponent,
    IgntColorPickerComponent,
    IgntIconComponent,
    IgntButtonComponent,
    IgntAlertComponent,
  ],
  selector: 'app-description-translation-field',
  standalone: true,
  styleUrl: './description-translation-field.component.scss',
  templateUrl: './description-translation-field.component.html',
})
export class DescriptionTranslationFieldComponent {
  readonly field = input.required<DescriptionField>();
  readonly uploadFileCallback = input.required<(file: File) => Observable<string>>();
  readonly hideOriginal = input<boolean>(false);
  readonly readOnly = input<boolean>(false);
  readonly showStatus = input<boolean>(true);

  readonly validate = output<DescriptionField>();
  readonly valueChange = output<string>();

  protected readonly blockBodyFeatures = RICH_TEXT_EDITOR_BLOCK_BODY_FEATURES;

  protected readonly countsInTotal: Signal<boolean> = computed<boolean>(() => descriptionFieldCountsInTotal(this.field()));

  protected readonly indicator: Signal<DescriptionFieldIndicator> = computed<DescriptionFieldIndicator>(() => {
    if (!this.countsInTotal()) {
      return 'none';
    }
    return isDescriptionFieldTranslated(this.field()) ? 'check' : 'warning';
  });

  protected readonly showValidate: Signal<boolean> = computed<boolean>(() => {
    if (this.readOnly() || !this.countsInTotal()) {
      return false;
    }
    const status = this.field().status;
    return status === 'outdated' || status === 'machine_translated';
  });

  protected readonly validateDisabled: Signal<boolean> = computed<boolean>(() => !canValidateDescriptionField(this.field()));

  protected readonly statusTextKey: Signal<string | null> = computed<string | null>(() => {
    if (!this.countsInTotal()) {
      return null;
    }
    switch (this.field().status) {
      case 'outdated':
        return 'planEdition.translationsEdition.descriptionBlocks.valueOutdated';
      case 'machine_translated':
        return 'planEdition.translationsEdition.descriptionBlocks.translatedByAi';
      default:
        return null;
    }
  });

  protected readonly statusAlertSentiment: Signal<'warning' | 'info'> = computed<'warning' | 'info'>(() =>
    this.field().status === 'machine_translated' ? 'info' : 'warning',
  );

  protected onValidateClick(): void {
    if (this.validateDisabled()) {
      return;
    }
    this.validate.emit(this.field());
  }

  protected onValueChange(value: string): void {
    this.valueChange.emit(value);
  }
}
