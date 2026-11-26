import { NgClass, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type WrapperCardVariant = 'default' | 'primary' | 'borderless' | 'unwrapped';

@Component({
  selector: 'ignt-wrapper-card',
  templateUrl: './ignt-wrapper-card.component.html',
  styleUrls: ['./ignt-wrapper-card.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgClass],
})
export class IgntWrapperCardComponent {
  @Input() backgroundColor?: string;
  @Input() elevation?: number;
  @Input() fullHeight = false;
  @Input() mobileBorderless?: boolean;
  @Input() radii?: number;
  @Input() title?: string;
  @Input() type?: WrapperCardVariant = 'default';
}
