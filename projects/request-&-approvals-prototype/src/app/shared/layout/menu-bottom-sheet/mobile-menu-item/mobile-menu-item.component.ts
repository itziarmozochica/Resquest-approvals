import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Params, RouterLink } from '@angular/router';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, RouterLink],
  selector: 'app-mobile-menu-item',
  standalone: true,
  styleUrls: ['./mobile-menu-item.component.scss'],
  templateUrl: './mobile-menu-item.component.html',
})
export class MobileMenuItemComponent {
  action = output<void>();
  disabled = input(false);
  label = input('');
  leadingIcon = input<IconProp>(['fal', 'circle']);
  link = input<string[] | null>(null);
  linkParams = input<Params | null>(null);
  variant = input<'sharp' | 'danger'>('sharp');

  onClick(): void {
    this.action.emit();
  }
}
