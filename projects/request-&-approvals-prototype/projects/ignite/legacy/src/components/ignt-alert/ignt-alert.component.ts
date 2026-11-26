import { NgClass, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  faBell,
  faCheck,
  faExclamationCircle,
  faExclamationTriangle,
  faInfoCircle,
  IconDefinition,
} from '@fortawesome/pro-solid-svg-icons';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

export enum AlertSentiment {
  accent = 'accent',
  danger = 'danger',
  info = 'info',
  positive = 'positive',
  warning = 'warning',
}

const iconType = {
  [AlertSentiment.accent]: faBell,
  [AlertSentiment.danger]: faExclamationCircle,
  [AlertSentiment.info]: faInfoCircle,
  [AlertSentiment.positive]: faCheck,
  [AlertSentiment.warning]: faExclamationTriangle,
};

type AlertSentimentType = 'info' | 'accent' | 'positive' | 'warning' | 'danger';

/**
 * @deprecated Use `IgntAlertComponent` from `@ignite/common` instead.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconsModule, NgIf, NgClass],
  selector: 'ignt-alert',
  standalone: true,
  styleUrls: ['./ignt-alert.component.scss'],
  templateUrl: './ignt-alert.component.html',
})
export class IgntAlertComponent {
  get alertClasses(): string {
    return this.contrast ? `alert--${this.sentiment}-contrast` : `alert--${this.sentiment}`;
  }

  get iconBySentiment(): IconDefinition {
    return iconType[this.sentiment];
  }

  readonly baseClass = 'alert';
  @Output() closeAlert = new EventEmitter<void>();
  @Input() contrast = false;
  icon: IconDefinition = faInfoCircle;
  isVisible = true;
  @Input() sentiment: AlertSentimentType = AlertSentiment.info;
  @Input() showCloseButton = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() testId = 'ignt-alert';
  @Input() title?: string;

  /**
   * Optional plain-text body. Rendered before any projected content.
   * For rich content (HTML, links, etc.), use projection: put content inside <ignt-alert>.
   * @deprecated Prefer projecting content via ng-content so the consumer controls sanitization and markup.
   */
  @Input() description = '';

  onClose(): void {
    this.isVisible = false;
    this.closeAlert.emit();
  }
}
