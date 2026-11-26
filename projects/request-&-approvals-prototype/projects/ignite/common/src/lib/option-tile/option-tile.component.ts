import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, NgOptimizedImage],
  selector: 'ignt-option-tile',
  standalone: true,
  styleUrl: './option-tile.component.scss',
  templateUrl: './option-tile.component.html',
})
export class IgntOptionTileComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly disabled = input(false);
  readonly hideTitle = input(false);
  readonly iconName = input<string>();
  readonly imageUrl = input<string>();
  readonly selected = input(false);

  readonly tileClick = output();
}
