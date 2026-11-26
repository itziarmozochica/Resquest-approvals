import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { FilterSelectModule } from '@fz-original/app/shared/layout/filters/select/select.module';
import { TranslateModule } from '@ngx-translate/core';

import { OnsiteSetupSalesChannelService } from '../../../services/onsite-setup-sales-channel.service';
import { getChannelsAndIncludeCurrentWhenMissing, shouldShowChannelSelector } from '../../../services/onsite-setup-sales-channel.utils';

@Component({
  selector: 'app-onsite-setup-sales-channel-selector',
  standalone: true,
  imports: [FilterSelectModule, TranslateModule],
  templateUrl: './onsite-setup-sales-channel-selector.component.html',
  styleUrls: ['./onsite-setup-sales-channel-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnsiteSetupSalesChannelSelectorComponent {
  readonly #salesChannelService = inject(OnsiteSetupSalesChannelService);

  readonly channelId = input.required<string>();
  readonly channelSelected = output<string>();

  readonly channelSelectOptions = computed(() =>
    getChannelsAndIncludeCurrentWhenMissing(this.#salesChannelService.partnerChannelOptions(), this.channelId()),
  );

  readonly selectedChannelOption = computed(() => {
    const channelId = this.channelId();
    if (channelId.length === 0) {
      return null;
    }

    return this.channelSelectOptions().find(option => option.id === channelId) ?? null;
  });

  readonly showChannelSelector = computed(() => shouldShowChannelSelector(this.channelSelectOptions()));

  selectChannel(option: SelectOption | null): void {
    if (!option?.id || this.channelId() === option.id) {
      return;
    }

    this.channelSelected.emit(option.id);
  }
}
