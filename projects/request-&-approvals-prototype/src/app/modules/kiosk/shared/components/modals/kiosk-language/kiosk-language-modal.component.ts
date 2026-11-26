import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgClass, NgFor, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import {
  KioskLanguage,
  KioskLanguageModalData,
} from '@fz-original/app/modules/kiosk/shared/components/modals/kiosk-language/kiosk-language-modal.model';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TranslateModule } from '@ngx-translate/core';

import { IconButtonComponent } from '../../icon-button/icon-button.component';
import { KioskBaseModal } from '../kiosk-base-modals.class';

@Component({
  selector: 'app-kiosk-language-modal',
  templateUrl: './kiosk-language-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-language-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NgClass, NgFor, TranslateModule, IconButtonComponent, NgStyle],
})
export class KioskLanguageModalComponent extends KioskBaseModal {
  #dialogRef = inject(DialogRef);
  data: KioskLanguageModalData = inject(DIALOG_DATA);

  constructor() {
    super(inject(UserService));
  }

  onLanguageSelected(lang: KioskLanguage | undefined) {
    this.#dialogRef.close(lang);
  }
}
