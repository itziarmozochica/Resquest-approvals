import { ChangeDetectionStrategy, Component, input, output, viewChild, type ElementRef } from '@angular/core';

import type { OnsiteSetupOption } from '@fz/ticketing';

import { FztOnsiteSetupTileComponent } from '../onsite-setup-tile/onsite-setup-tile.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FztOnsiteSetupTileComponent],
  selector: 'fzt-onsite-setup-setup-picker',
  styleUrl: './onsite-setup-setup-picker.component.scss',
  templateUrl: './onsite-setup-setup-picker.component.html',
})
export class FztOnsiteSetupSetupPickerComponent {
  private readonly section = viewChild<ElementRef<HTMLElement>>('section');
  readonly label = input.required<string>();
  readonly setups = input.required<readonly OnsiteSetupOption[]>();
  readonly disabled = input(false);
  readonly selectedSetupId = input<string | null>(null);
  readonly setupSelected = output<OnsiteSetupOption>();

  scrollIntoView(): void {
    this.section()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
