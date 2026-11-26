import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { NotificationsScrollEdgesDirective } from '../../directives/notifications-scroll-edges.directive';
import { InboxNotification } from '../../models/inbox-notification.model';
import { NotificationAppearance } from '../../models/notification-appearance.model';
import { ScrollEdgesState } from '../../models/scroll-edges-state.model';
import { NotificationItemComponent } from '../notifications-panel/components/notification-item/notification-item.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NotificationItemComponent, IgntButtonComponent, NotificationsScrollEdgesDirective, TranslateModule],
  selector: 'app-notifications-list',
  standalone: true,
  styleUrl: './notifications-list.component.scss',
  templateUrl: './notifications-list.component.html',
})
export class NotificationsListComponent {
  readonly error = input.required<unknown>();
  readonly hasMore = input.required<boolean>();
  readonly isLoading = input.required<boolean>();
  readonly isLoadingMore = input.required<boolean>();
  readonly notifications = input.required<InboxNotification[]>();
  readonly appearance = input<NotificationAppearance>('card');
  readonly edgeHints = input(false);

  readonly loadMore = output<void>();
  readonly openAssistant = output<{ notification: InboxNotification; position: number }>();
  readonly retry = output<void>();
  readonly scrollEdges = output<ScrollEdgesState>();

  readonly #destroyRef = inject(DestroyRef);

  protected readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  constructor() {
    this.#observeSentinel();
  }

  onOpenAssistant(notification: InboxNotification, position: number): void {
    this.openAssistant.emit({ notification, position });
  }

  onRetry(): void {
    this.retry.emit();
  }

  onScrollEdges(edges: ScrollEdgesState): void {
    this.scrollEdges.emit(edges);
  }

  #observeSentinel(): void {
    afterNextRender(() => {
      const sentinelEl = this.sentinel()?.nativeElement;
      if (sentinelEl == null || typeof IntersectionObserver === 'undefined') return;

      const observer = new IntersectionObserver(
        entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          if (this.isLoading() || this.isLoadingMore()) return;
          if (this.hasMore()) {
            this.loadMore.emit();
            return;
          }
          if (this.notifications().length > 0) observer.disconnect();
        },
        { root: null, rootMargin: '0px 0px 200px 0px' },
      );
      observer.observe(sentinelEl);
      this.#destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
