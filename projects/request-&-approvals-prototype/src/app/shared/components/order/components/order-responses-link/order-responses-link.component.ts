import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IgntButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, RouterLink, TranslateModule],
  selector: 'app-order-responses-link',
  styleUrl: './order-responses-link.component.scss',
  templateUrl: './order-responses-link.component.html',
})
export class OrderResponsesLinkComponent {
  readonly orderId = input.required<number>();
  readonly ticketIndex = input<number | null>(null);

  protected readonly fragment = computed<string | undefined>(() => {
    const ticketIndex = this.ticketIndex();

    return ticketIndex === null ? undefined : `ticket-${ticketIndex}`;
  });
}
