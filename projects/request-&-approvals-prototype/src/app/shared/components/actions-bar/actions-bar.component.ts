import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-actions-bar',
  standalone: true,
  styleUrls: ['./actions-bar.component.scss'],
  templateUrl: './actions-bar.component.html',
})
export class ActionsBarComponent {
  @Output() back = new EventEmitter<void>();
  @Input() backButtonTestId?: string;
  @Input() backTranslationKey = 'planSettings.back';
  @Input() confirmTranslationKey = 'planSettings.confirm';
  @Output() continue = new EventEmitter<void>();
  @Input() continueButtonDisabled = false;
  @Input() continueButtonLabel?: string;
  @Input() continueButtonLoading = false;
  @Input() continueButtonTestId?: string;
  @Input() continueButtonTranslationKey?: string;
  @Input() continueTranslationKey = 'planSettings.continue';
  @Output() saveDraft = new EventEmitter<void>();
  @Input() saveDraftDisabled = false;
  @Input() saveDraftLoading = false;
  @Input() saveDraftTestId?: string;
  @Input() saveDraftTranslationKey = 'planSettings.saveDraft';
  @Input() savingTranslationKey = 'common.saving';
  @Input() showBackButton = false;
  @Input() showSaveDraftButton = true;
  @Input() useConfirmButton = false;
}
