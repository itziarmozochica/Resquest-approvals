import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { NavigationItem } from '../../models/navigation-item.interface';
import { FragmentScrollService } from '../../services/fragment-scroll.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:scroll)': 'onScroll()',
  },
  imports: [RouterModule, TranslateModule],
  selector: 'app-settings-sidebar-nav',
  standalone: true,
  styleUrls: ['./settings-sidebar-nav.component.scss'],
  templateUrl: './settings-sidebar-nav.component.html',
})
export class SettingsSidebarNavComponent {
  readonly navigationItems = input.required<NavigationItem[]>();
  readonly activeSection = model<string>('');

  protected readonly visibleNavigationItems = computed<NavigationItem[]>(() =>
    this.navigationItems().filter(item => item.condition === undefined || item.condition),
  );

  readonly #document = inject(DOCUMENT);
  readonly #fragmentScrollService = inject(FragmentScrollService);
  readonly #scrollOffset = 150;

  onScroll(): void {
    this.#updateActiveSection();
  }

  scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    this.#fragmentScrollService.scrollToFragment(sectionId, { delay: 50 });
  }

  #updateActiveSection(): void {
    const sectionIds = this.visibleNavigationItems().map(item => item.id);
    const scrollPosition = (this.#document.defaultView?.pageYOffset ?? 0) + this.#scrollOffset;

    for (const sectionId of sectionIds) {
      const element = this.#document.getElementById(sectionId);
      if (element) {
        const { bottom, top } = element.getBoundingClientRect();
        const elementTop = top + (this.#document.defaultView?.pageYOffset ?? 0);
        const elementBottom = bottom + (this.#document.defaultView?.pageYOffset ?? 0);

        if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
          if (this.activeSection() !== sectionId) {
            this.activeSection.set(sectionId);
          }
          break;
        }
      }
    }
  }
}
