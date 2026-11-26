import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

import { ClickHelpTopicLinkData, ClickHelpTopicLinkEvent } from '@fz-original/app/core/tracking/core/events/click-help-topic-link';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';

import { SharedComponentsModule } from '../shared-components.module';

@Component({
  selector: 'app-help-topic-banner',
  standalone: true,
  templateUrl: './help-topic-banner.component.html',
  styleUrls: ['./help-topic-banner.component.scss'],
  imports: [SharedComponentsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpTopicBannerComponent {
  #router = inject(Router);
  #trackingService = inject(TrackingService);
  @Input() ctaLabel = '';
  @Input() ctaLink = '';
  @Output() helpTopicClosed = new EventEmitter<void>();
  @Input() message: string | null = '';

  handleClose(): void {
    this.helpTopicClosed.emit();
  }

  trackHelpTopicInteraction(): void {
    const event: ClickHelpTopicLinkData = {
      screen: this.#router.url,
      link_out: this.ctaLink,
    };
    this.#trackingService.track(new ClickHelpTopicLinkEvent(event));
  }
}
