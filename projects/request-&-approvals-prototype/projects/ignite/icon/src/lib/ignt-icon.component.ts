import { ChangeDetectionStrategy, Component, computed, inject, input, Signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { IgntIconService } from './ignt-icon.service';
import { IgntIconDefinition } from './interfaces/ignt-icon-rendered';
import { IgntIconSize } from './interfaces/ignt-icon-size';
import { IgntIconVariant } from './interfaces/ignt-icon-variant';
import { IgntIconName } from './interfaces/ignt-icon.name';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ignt-icon--size-base]': 'size() === "base"',
    '[class.ignt-icon--size-caption]': 'size() === "caption"',
    '[class.ignt-icon--size-display]': 'size() === "display"',
    '[class.ignt-icon--size-h1]': 'size() === "h1"',
    '[class.ignt-icon--size-h2]': 'size() === "h2"',
    '[class.ignt-icon--size-h3]': 'size() === "h3"',
    '[class.ignt-icon--size-h4]': 'size() === "h4"',
    '[class.ignt-icon--size-sm]': 'size() === "sm"',
    '[innerHTML]': 'iconHtml()',
  },
  selector: 'ignt-icon',
  standalone: true,
  styleUrl: './ignt-icon.component.scss',
  template: '',
})
export class IgntIconComponent {
  readonly #domSanitizer = inject(DomSanitizer);
  readonly #igntIconService = inject(IgntIconService);

  /**
   * The name of the icon to display.
   */
  name = input.required<IgntIconName>();
  /**
   * The variant of the icon to display.
   */
  variant = input.required<IgntIconVariant>();
  /**
   * Whether to display the icon with a fixed width.
   */
  fixedWidth = input<boolean>(false);
  /**
   * The size of the icon to display.
   */
  size = input<IgntIconSize>('base');
  /**
   * Whether to display the icon with a spin animation.
   */
  spin = input<boolean>(false);

  protected iconHtml: Signal<SafeHtml | null> = computed(() => {
    const iconDef: IgntIconDefinition | null = this.#igntIconService.getIconDefinition(this.name(), this.variant(), {
      fixedWidth: this.fixedWidth(),
      spin: this.spin(),
    });
    return iconDef ? this.#domSanitizer.bypassSecurityTrustHtml(iconDef.svg) : null;
  });
}
