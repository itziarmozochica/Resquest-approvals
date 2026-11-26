import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { KioskButtonComponent } from '../../button/kiosk-button.component';
import { IconButtonComponent } from '../../icon-button/icon-button.component';
import { KioskTermsModalData } from './kiosk-terms-modal.model';

@Component({
  selector: 'app-kiosk-terms-modal',
  templateUrl: './kiosk-terms-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-terms-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IconButtonComponent, KioskButtonComponent, TranslateModule],
})
export class KioskTermsModalComponent {
  #dialogRef = inject(DialogRef);
  #translateService = inject(TranslateService);
  data: KioskTermsModalData = inject(DIALOG_DATA);

  bodyHtml = computed(() => {
    const translatedText = this.#translateService.instant(this.data.bodyKey);
    return translatedText.replace(/<a\s*[^>]*>(.*?)<\/a>/gi, '$1');
  });

  accept(): void {
    this.#dialogRef.close(true);
  }

  close(): void {
    this.#dialogRef.close(false);
  }
}
