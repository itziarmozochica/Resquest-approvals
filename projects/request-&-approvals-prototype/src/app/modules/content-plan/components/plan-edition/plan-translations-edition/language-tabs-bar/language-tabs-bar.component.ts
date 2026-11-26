import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { TemplatedTooltipDirective } from '@fz-original/app/shared/directives/templated-tooltip.directive';
import { IgntAlertComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import { LanguageTab } from './language-tab.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntButtonComponent, IgntIconComponent, IgntTagComponent, TemplatedTooltipDirective, TranslateModule],
  selector: 'app-language-tabs-bar',
  standalone: true,
  styleUrl: './language-tabs-bar.component.scss',
  templateUrl: './language-tabs-bar.component.html',
})
export class LanguageTabsBarComponent {
  readonly canEdit = input<boolean>(true);
  readonly hasTranslations = input<boolean>(true);
  readonly languages = input<LanguageTab[]>([]);
  readonly selectedLanguageCode = input<string>('');
  readonly addLanguageClick = output<void>();
  readonly editClick = output<void>();
  readonly languageSelected = output<string>();

  readonly hasMissingTranslations = computed(() => this.languages().some((tab: LanguageTab) => tab.status === 'missing'));

  isSelected(code: string): boolean {
    return code === this.selectedLanguageCode();
  }

  onAddLanguageClick(): void {
    if (!this.canEdit()) {
      return;
    }
    this.addLanguageClick.emit();
  }

  onEditClick(): void {
    if (!this.canEdit()) {
      return;
    }
    this.editClick.emit();
  }

  onLanguageClick(code: string): void {
    this.languageSelected.emit(code);
  }
}
