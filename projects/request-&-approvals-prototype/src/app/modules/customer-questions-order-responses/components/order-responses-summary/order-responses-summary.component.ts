import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntDividerComponent } from '@ignite/legacy/components/ignt-divider/ignt-divider.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { OrderResponsesSummary } from '../../models/order-responses-summary.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IgntDividerComponent, IgntIconComponent, IgntWrapperCardComponent, TranslateModule],
  selector: 'app-order-responses-summary',
  styleUrl: './order-responses-summary.component.scss',
  templateUrl: './order-responses-summary.component.html',
})
export class OrderResponsesSummaryComponent {
  static readonly elevation = 1;

  readonly answeredCount = input.required<number>();
  readonly questionCount = input.required<number>();
  readonly summary = input.required<OrderResponsesSummary>();

  protected readonly elevation = OrderResponsesSummaryComponent.elevation;
}
