import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-cross-event-bulk-edit-applies-to',
  styleUrl: './cross-event-bulk-edit-applies-to.component.scss',
  templateUrl: './cross-event-bulk-edit-applies-to.component.html',
})
export class CrossEventBulkEditAppliesToComponent {
  static readonly appliesToKey = 'listPlan.crossEventBulkEdit.properties.appliesTo';
  static readonly appliesToOneEventKey = 'listPlan.crossEventBulkEdit.properties.appliesToOneEvent';
  static readonly appliesToOneTicketTypeKey = 'listPlan.crossEventBulkEdit.properties.appliesToOneTicketType';
  static readonly appliesToOneTicketTypeOneEventKey = 'listPlan.crossEventBulkEdit.properties.appliesToOneTicketTypeOneEvent';

  readonly eventCount = input.required<number>();
  readonly testId = input('');
  readonly ticketTypeCount = input.required<number>();

  protected readonly messageKey = computed(() => {
    const eventCount = this.eventCount();
    const ticketTypeCount = this.ticketTypeCount();
    if (ticketTypeCount === 1 && eventCount === 1) {
      return CrossEventBulkEditAppliesToComponent.appliesToOneTicketTypeOneEventKey;
    }
    if (ticketTypeCount === 1) {
      return CrossEventBulkEditAppliesToComponent.appliesToOneTicketTypeKey;
    }
    if (eventCount === 1) {
      return CrossEventBulkEditAppliesToComponent.appliesToOneEventKey;
    }

    return CrossEventBulkEditAppliesToComponent.appliesToKey;
  });
  protected readonly testIdAttr = computed(() => {
    const testId = this.testId();
    if (testId === '') {
      return null;
    }

    return testId;
  });
  protected readonly translationParams = computed(() => ({
    eventCount: this.eventCount(),
    ticketTypeCount: this.ticketTypeCount(),
  }));
}
