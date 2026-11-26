import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { IgntAccordionComponent, IgntAccordionItemComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';

import type { ReservationsCartCardView } from './cart-card-view.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAccordionComponent, IgntAccordionItemComponent, IgntIconComponent],
  selector: 'reservations-cart-card',
  standalone: true,
  styleUrl: './cart-card.component.scss',
  templateUrl: './cart-card.component.html',
})
export class ReservationsCartCardComponent {
  readonly view = input.required<ReservationsCartCardView>();

  readonly expanded = model<boolean>(true);
}
