import { UniqueSelectionDispatcher } from '@angular/cdk/collections';
import { CdkMenu, CdkMenuItemRadio } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, contentChild, contentChildren, inject, output } from '@angular/core';

import { IgntMenuItemCustomTemplateDirective } from './directives/menu-item-custom-template.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ignt-menu',
  },
  hostDirectives: [
    {
      directive: CdkMenu,
      outputs: ['closed'],
    },
  ],
  providers: [UniqueSelectionDispatcher],
  selector: 'ignt-menu',
  standalone: true,
  styleUrl: './menu.component.scss',
  templateUrl: './menu.component.html',
})
export class IgntMenuComponent {
  readonly #cdkMenu = inject(CdkMenu);

  /* Emits when a Menu Item child is selected */
  readonly menuItemSelected = output<string>();

  /* @internal */
  readonly menuItemCustomTemplate = contentChild(IgntMenuItemCustomTemplateDirective);

  protected readonly radioItems = contentChildren(CdkMenuItemRadio, { descendants: true });

  constructor() {
    const focusFirstItem = this.#cdkMenu.focusFirstItem.bind(this.#cdkMenu);
    this.#cdkMenu.focusFirstItem = (focusOrigin = 'program'): void => {
      focusFirstItem(focusOrigin);
      const checkedItem = this.radioItems().find(item => item.checked && !item.disabled);
      if (checkedItem) {
        this.#cdkMenu.setActiveMenuItem(checkedItem);
      }
    };
  }
}
