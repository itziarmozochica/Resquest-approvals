import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  inject,
  input,
  Signal,
  TemplateRef,
} from '@angular/core';

import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';

import { IgntDialogCloseDirective } from '../../directives/dialog-close.directive';
import { IgntDialogTranslationsDirective, withIgntDialogTranslations } from '../../directives/dialog-translations.directive';
import { IgntDialogTranslations } from '../../models/dialog-translations';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ignt-dialog-header--auxiliary-content]': '!!auxiliaryContent()',
  },
  hostDirectives: [withIgntDialogTranslations()],
  imports: [NgTemplateOutlet, IgntDialogCloseDirective, IgntIconButtonComponent],
  selector: 'ignt-dialog-header',
  standalone: true,
  styleUrl: './dialog-header.component.scss',
  templateUrl: './dialog-header.component.html',
})
export class IgntDialogHeaderComponent {
  focusCloseButton = input(false, { transform: booleanAttribute });
  hideCloseButton = input(false, { transform: booleanAttribute });
  auxiliaryContent = contentChild<TemplateRef<unknown>>(TemplateRef, { descendants: false });

  protected readonly translations: Signal<IgntDialogTranslations> = inject(IgntDialogTranslationsDirective).translations;
  protected readonly auxiliaryContentResolved = computed(() => this.auxiliaryContent() ?? null);
}
