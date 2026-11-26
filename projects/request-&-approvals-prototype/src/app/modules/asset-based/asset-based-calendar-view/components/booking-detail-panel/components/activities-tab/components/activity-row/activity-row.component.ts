import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { TranslateModule } from '@ngx-translate/core';

import { ActivityRow } from '../../../../models/activity-row.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntExpansionPanelComponent, IgntIconButtonComponent, IgntLinkComponent, TranslateModule],
  selector: 'app-activity-row',
  standalone: true,
  styleUrl: './activity-row.component.scss',
  templateUrl: './activity-row.component.html',
})
export class ActivityRowComponent {
  row = input.required<ActivityRow>();

  locateAsset = output<number>();
  moveAsset = output<number>();

  onLocateAsset(bookedSlotId: number, event: Event): void {
    // The link has no href, so Space would scroll the panel before the calendar moves.
    event.preventDefault();
    this.locateAsset.emit(bookedSlotId);
  }

  onMoveAsset(bookedSlotId: number): void {
    this.moveAsset.emit(bookedSlotId);
  }
}
