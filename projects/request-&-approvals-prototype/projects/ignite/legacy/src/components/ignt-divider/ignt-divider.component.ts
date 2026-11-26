import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

type DividerVariant = 'solid' | 'dotted' | 'dashed';
type DividerOrientation = 'horizontal' | 'vertical';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ignt-divider--vertical]': "orientation() === 'vertical'",
  },
  imports: [],
  selector: 'ignt-divider',
  styleUrl: './ignt-divider.component.scss',
  templateUrl: './ignt-divider.component.html',
})
export class IgntDividerComponent {
  readonly label = input<string | null>(null);
  readonly margin = input(true, { transform: booleanAttribute });
  readonly orientation = input<DividerOrientation>('horizontal');
  readonly variant = input<DividerVariant>('solid');
}
