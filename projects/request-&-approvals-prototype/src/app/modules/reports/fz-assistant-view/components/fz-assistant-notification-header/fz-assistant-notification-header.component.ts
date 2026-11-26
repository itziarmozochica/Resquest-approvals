import { ChangeDetectionStrategy, Component, computed, input, output, type Signal } from '@angular/core';

import { TagListWithOverflowComponent } from '@fz-original/app/shared/components/tag/tag-list-with-overflow.component';
import { IgntTooltipDirective } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import type { FzAssistantNotificationSummary } from '../fz-assistant-notifications-dialog/fz-assistant-notifications-dialog-data.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.fz-assistant-notification-header--divided]': 'divided()',
  },
  imports: [
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntTooltipDirective,
    TagListWithOverflowComponent,
    TranslateModule,
    RelativeTimePipe,
  ],
  selector: 'app-fz-assistant-notification-header',
  standalone: true,
  styleUrl: './fz-assistant-notification-header.component.scss',
  templateUrl: './fz-assistant-notification-header.component.html',
})
export class FzAssistantNotificationHeaderComponent {
  readonly notification = input.required<FzAssistantNotificationSummary>();
  readonly copied = input<boolean>(false);
  /** Whether the parent renders content below the header; the parent owns this so the divider can't outlive its content. */
  readonly divided = input<boolean>(false);
  readonly shareUrl = input<string | null>(null);
  readonly share = output<void>();

  protected readonly subtitle: Signal<string | null> = computed(() => {
    const planTitle = this.notification().planTitle;
    return planTitle !== null && planTitle.trim().length > 0 ? planTitle : null;
  });

  /**
   * Lower line, mirroring the inbox list item: the `description`. Suppressed for `markdown`/`fz_assistant`,
   * whose body renders in the dialog content area instead.
   */
  protected readonly blurb: Signal<string | null> = computed(() => {
    const notification = this.notification();
    const suppressesBlurb = notification.contentType === 'markdown' || notification.contentType === 'fz_assistant';
    return !suppressesBlurb && notification.description.length > 0 ? notification.description : null;
  });
}
