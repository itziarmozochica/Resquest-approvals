import { ChangeDetectionStrategy, Component, computed, input, output, Signal } from '@angular/core';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { ButtonSentiment, IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

export interface CenteredDialogFooterConfig {
  cancelLabel?: string;
  submitDisabled?: boolean;
  submitLabel?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconsModule, IgntButtonComponent, TranslateModule],
  selector: 'app-centered-dialog',
  standalone: true,
  styleUrls: ['./centered-dialog.component.scss'],
  templateUrl: './centered-dialog.component.html',
})
export class CenteredDialogComponent {
  cancelButtonSentiment = input<ButtonSentiment>('tertiary');
  closed = output<void>();
  closeOnBackdropClick = input(true);
  disableSubmitButton = input(false);
  footer = input<CenteredDialogFooterConfig | null>(null);
  isSubmitDisabled: Signal<boolean> = computed<boolean>(() => this.disableSubmitButton() || !!this.footer()?.submitDisabled);
  isVisible = input(false);
  submitted = output<void>();
  title = input('');

  dismiss(): void {
    this.closed.emit();
  }

  submit(): void {
    this.submitted.emit();
  }
}
