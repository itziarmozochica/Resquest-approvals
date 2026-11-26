import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.fzt-onsite-setup-tile--disabled]': 'disabled()',
    '[class.fzt-onsite-setup-tile--selected]': 'selected()',
  },
  selector: 'fzt-onsite-setup-tile',
  styleUrl: './onsite-setup-tile.component.scss',
  templateUrl: './onsite-setup-tile.component.html',
})
export class FztOnsiteSetupTileComponent {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly selected = input(false, { transform: booleanAttribute });
  readonly tileClick = output();

  protected onClick(): void {
    if (this.disabled()) {
      return;
    }

    this.tileClick.emit();
  }
}
