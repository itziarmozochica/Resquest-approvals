import { ChangeDetectionStrategy, Component, computed, input, output, type Signal } from '@angular/core';

import type { FztPartyHourPillsVm, FztTimePillsRowLayout } from '../../models/party-date-panel-vm.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'fzt-time-pills-row',
  styleUrl: './time-pills-row.component.scss',
  templateUrl: './time-pills-row.component.html',
})
export class FztTimePillsRowComponent {
  readonly nowLabel = input.required<string>();
  readonly vm = input.required<FztPartyHourPillsVm>();
  readonly layout = input<FztTimePillsRowLayout>('row');
  readonly hourSelected = output<string | null>();

  protected readonly isGrid: Signal<boolean> = computed(() => this.layout() === 'grid');

  protected onPillPressed(isSelected: boolean, hour: string | null): void {
    if (isSelected) {
      return;
    }

    this.hourSelected.emit(hour);
  }
}
