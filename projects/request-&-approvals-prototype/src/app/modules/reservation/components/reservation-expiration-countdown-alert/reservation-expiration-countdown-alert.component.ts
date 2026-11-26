import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

export interface ReservationExpirationDeadlineFormatted {
  dateTime: string;
  timezone: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntButtonComponent, TranslateModule],
  selector: 'app-reservation-expiration-countdown-alert',
  standalone: true,
  styleUrls: ['./reservation-expiration-countdown-alert.component.scss'],
  templateUrl: './reservation-expiration-countdown-alert.component.html',
})
export class ReservationExpirationCountdownAlertComponent {
  readonly canEditDeadlines = input(false);
  readonly deadline = input<ReservationExpirationDeadlineFormatted | null>(null);
  readonly deadlineLabelKey = input('reservation.checkout.paymentSelector.paymentDeadlineLabel');
  readonly editDeadlinesLabelKey = input('reservations.deadlines.editDeadlinesLink');
  readonly testId = input('reservation-expiration-countdown-alert');
  readonly timeLeft = input<string | null>(null);
  readonly editDeadlines = output<void>();
}
