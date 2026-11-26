import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'translation-field-count-badge-host',
  },
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-translation-field-count-badge',
  standalone: true,
  styleUrl: './translation-field-count-badge.component.scss',
  templateUrl: './translation-field-count-badge.component.html',
})
export class TranslationFieldCountBadgeComponent {
  readonly showScopeStatusIcon = input<boolean>(false);
  readonly testId = input<string>('translation-field-count-badge');
  readonly totalCount = input<number>(0);
  readonly translatedCount = input<number>(0);

  readonly isComplete: Signal<boolean> = computed<boolean>(() => this.totalCount() > 0 && this.translatedCount() >= this.totalCount());
}
