import { ChangeDetectionStrategy, Component, computed, input, output, Signal } from '@angular/core';

import { RelativeTimePipe } from '@fz-original/app/modules/reports/fz-assistant-view/pipes/relative-time.pipe';
import { TagListWithOverflowComponent } from '@fz-original/app/shared/components/tag/tag-list-with-overflow.component';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { InboxNotification, PostAction, PostActionType } from '../../../../models/inbox-notification.model';
import { NotificationAppearance } from '../../../../models/notification-appearance.model';
import { NotificationTag, resolveNotificationTags } from '../../../../models/notification-tag.config';

const FZ_ASSISTANT_ACTION: PostActionType = 'open_fz_assistant';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.notification-item--flat]': "appearance() === 'flat'",
    '[class.notification-item--read]': 'notification().isRead',
  },
  imports: [TranslateModule, IgntIconComponent, TagListWithOverflowComponent, RelativeTimePipe],
  selector: 'app-notification-item',
  standalone: true,
  styleUrl: './notification-item.component.scss',
  templateUrl: './notification-item.component.html',
})
export class NotificationItemComponent {
  readonly notification = input.required<InboxNotification>();
  readonly appearance = input<NotificationAppearance>('card');
  readonly openAssistant = output<InboxNotification>();

  protected readonly assistantAction: Signal<PostAction | null> = computed(
    () => this.notification().postActions.find(action => action.type === FZ_ASSISTANT_ACTION) ?? null,
  );

  protected readonly tags: Signal<readonly NotificationTag[]> = computed(() => resolveNotificationTags(this.notification().tags));

  /** planTitle already resolves plan_title → partner_name → city in the adapter; no further fallback needed here. */
  protected readonly subtitle: Signal<string | null> = computed(() => this.#cleanLabel(this.notification().planTitle));

  protected readonly showsChevron: Signal<boolean> = computed(() => this.appearance() === 'flat' && this.assistantAction() !== null);

  protected onActivate(): void {
    this.openAssistant.emit(this.notification());
  }

  /** The card surface is not a native button, so `Space` must be stopped from scrolling the list. */
  protected onSpaceKeydown(event: Event): void {
    event.preventDefault();
    this.onActivate();
  }

  #cleanLabel(value: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed && trimmed !== '-' ? trimmed : null;
  }
}
