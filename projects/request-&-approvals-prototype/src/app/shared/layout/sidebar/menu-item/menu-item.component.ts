import { Component, computed, input, Input } from '@angular/core';
import { Params } from '@angular/router';

import { IconName, IconPrefix } from '@fortawesome/pro-duotone-svg-icons';

@Component({
  selector: 'app-menu-item',
  standalone: false,
  templateUrl: './menu-item.component.html',
  styleUrls: ['../../../../../theme/components/navigation/aside-menu/menu-item.scss'],
})
export class MenuItemComponent {
  @Input() onlyIcon = false;
  @Input() accordion = false;
  @Input() showTag = false;
  @Input() showIcon = true;
  @Input() icon?: [IconPrefix, IconName];
  @Input() text = '';
  readonly showAiBadge = input<boolean>(false);
  readonly openInNewTab = input(true);
  link = input<string | null>(null);
  @Input() section = '';
  @Input() queryParams: Params | null = null;
  @Input() active?: boolean;
  @Input() pathOption: 'exact' | 'subset' = 'exact';
  @Input() isOpen = false;
  /** Turn off when `active` owns the highlight: routerLinkActive strips the class on routes its link does not match. */
  readonly useRouterLinkActive = input(true);

  protected readonly isExternalLink = computed<boolean>(() => {
    const providedLink = this.link();
    if (providedLink === null) {
      return false;
    }
    return providedLink.startsWith('http://') || providedLink.startsWith('https://');
  });
}
