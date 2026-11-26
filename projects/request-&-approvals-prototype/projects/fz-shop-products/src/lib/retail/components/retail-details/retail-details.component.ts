import { DatePipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, Signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { RetailSetupType } from '../../../core/models/retail-setup-type.model';
import type { AvailableRetailSetup, RetailSetup, RetailSetupId } from '../../models/retail-setup/retail-setup.model';
import { retailTypeIcons, retailTypeLabels } from '../../models/retail-type.model';
import { RetailSetupSelectorComponent } from '../retail-setup-selector/retail-setup-selector.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    IgntButtonComponent,
    IgntIconComponent,
    IgntTagComponent,
    IgntWrapperCardComponent,
    NgOptimizedImage,
    RetailSetupSelectorComponent,
    TranslateModule,
  ],
  selector: 'fz-retail-details',
  standalone: true,
  styleUrl: './retail-details.component.scss',
  templateUrl: './retail-details.component.html',
})
export class RetailDetailsComponent {
  readonly retailSetup = input.required<RetailSetup>();
  readonly availableRetailSetups = input<AvailableRetailSetup[]>([]);
  readonly editRetailSetup = output<RetailSetup>();
  readonly selectedRetailSetupId = output<RetailSetupId>();

  protected readonly retailTypeIcon: Signal<string> = computed(() => retailTypeIcons[this.retailSetup().type as RetailSetupType]);

  protected readonly retailType: Signal<string> = computed(() => retailTypeLabels[this.retailSetup().type as RetailSetupType]);

  protected readonly showRetailSetupSelector: Signal<boolean> = computed(() => this.availableRetailSetups().length > 1);
}
