import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { KioskCategory } from '@fz-original/app/modules/kiosk/models/kiosk-category-group.model';
import { KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { TranslateModule } from '@ngx-translate/core';

import { KioskButtonComponent } from '../button/kiosk-button.component';
import { KioskPlanSquareCarouselRowComponent } from '../plan-square-carousel-row/kiosk-plan-square-carousel-row.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, KioskButtonComponent, KioskPlanSquareCarouselRowComponent],
  selector: 'app-kiosk-category-section',
  standalone: true,
  styleUrls: ['./kiosk-category-section.component.scss'],
  templateUrl: './kiosk-category-section.component.html',
})
export class KioskCategorySectionComponent {
  category = input.required<KioskCategory>();
  plans = input<KioskPlanItem[]>([]);
  onItemClicked = input<(plan: KioskPlanItem) => void>(() => {});
  showAllClicked = output<string>();

  hasTitle = computed(() => this.category().name != null);

  onShowAll(): void {
    const id = this.category().id;
    if (id !== null) {
      this.showAllClicked.emit(id);
    }
  }
}
