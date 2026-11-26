import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntTooltipDirective } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';

import { FztTapWaveDirective } from '../../directives/tap-wave.directive';
import { FztTooltipGesturesDirective } from '../../directives/tooltip-gestures.directive';
import { FztTruncationDirective } from '../../directives/truncation.directive';
import type { FztPartyStartTimeVm, FztPartyTileVm } from '../../models/party-ticket-column-vm.model';
import type { ResolvedFztTicketSelectorTranslations } from '../../models/ticket-selector-translations.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FztTapWaveDirective, FztTooltipGesturesDirective, FztTruncationDirective, IgntIconComponent, IgntTooltipDirective],
  selector: 'fzt-party-tile',
  styleUrl: './party-tile.component.scss',
  templateUrl: './party-tile.component.html',
})
export class FztPartyTileComponent {
  readonly translations = input.required<ResolvedFztTicketSelectorTranslations>();
  readonly vm = input.required<FztPartyTileVm>();
  readonly startTimeSelected = output<FztPartyStartTimeVm>();
}
