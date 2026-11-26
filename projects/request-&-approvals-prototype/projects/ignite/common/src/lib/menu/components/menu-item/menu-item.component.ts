import { CdkMenuItem } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntSentiment } from '../../../core/models/sentiment';
import { IgntMenuComponent } from '../../menu.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ignt-menu-item--danger]': 'sentiment() === "danger"',
  },
  hostDirectives: [
    {
      directive: CdkMenuItem,
      inputs: ['cdkMenuItemDisabled: disabled'],
      outputs: ['cdkMenuItemTriggered: triggered'],
    },
  ],
  imports: [NgTemplateOutlet],
  selector: 'ignt-menu-item',
  standalone: true,
  styleUrl: './menu-item.component.scss',
  templateUrl: './menu-item.component.html',
})
export class IgntMenuItemComponent {
  readonly #cdkMenuItemRef = inject(CdkMenuItem);
  readonly #parentMenu = inject(IgntMenuComponent);

  /* Text to be displayed */
  readonly label = input.required<string>();
  /* Value to be emitted by the Menu when the given Menu Item is selected. Intended to be unique. */
  readonly value = input.required<string>();
  /* Whether the Menu Item is disabled or not */
  readonly disabled = input(false);
  /* The sentiment of the Menu Item */
  readonly sentiment = input<IgntSentiment>();

  protected readonly menuItemCustomTemplate = computed(() => this.#parentMenu.menuItemCustomTemplate());
  protected readonly templateContext = computed(() => ({
    $implicit: {
      disabled: this.disabled(),
      label: this.label(),
      sentiment: this.sentiment(),
      value: this.value(),
    },
  }));

  constructor() {
    this.#cdkMenuItemRef.triggered.pipe(takeUntilDestroyed()).subscribe(() => {
      this.#parentMenu.menuItemSelected.emit(this.value());
    });
  }
}
