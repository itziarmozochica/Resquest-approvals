import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { accentReadableOnWhite, contrastTextForBackground } from '../_shared/color.utils';
import { resolvePlaceholder } from '../_shared/placeholder.util';
import { BlockOf, InfoCard } from '../../models/block.model';
import { bulletLinesFromCard, resolveCardAccent } from './info-card.helpers';
import { INFO_CARD_I18N } from './info-card.i18n-keys';

/**
 * The info-card carousel is intentionally a thin wrapper around native
 * horizontal scroll (`overflow-x: auto` + `scroll-snap-type: x mandatory`
 * from the SCSS). The previous incarnation shipped JS-driven mouse drag,
 * inertia, and prev/next arrow buttons — all of which had to be removed
 * from the published HTML because `<script>` tags set via `innerHTML` /
 * `set:html` never execute (HTML5 spec). To keep WYSIWYG between the
 * editor and the published page, that interactivity is also gone from
 * this component. Users navigate the carousel with touch swipe, two-finger
 * trackpad, mouse-wheel + Shift, or the now-visible thin scrollbar
 * (override in the SCSS). The `data-info-cards-block` /
 * `data-info-cards-track` markers stay on the DOM so a consumer-side
 * enhancer in webclient3 could later re-introduce drag/arrows without
 * either side needing to know about the other.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  selector: 'app-db-info-card-canvas',
  standalone: true,
  styleUrl: './info-card-canvas.component.scss',
  templateUrl: './info-card-canvas.component.html',
})
export class InfoCardCanvasComponent {
  readonly block = input.required<BlockOf<'infoCard'>>();
  /** Editor-only: muted hints over empty text props. MUST stay `false` for export. */
  readonly showPlaceholders = input<boolean>(false);

  readonly KEYS = INFO_CARD_I18N;

  readonly #translate = inject(TranslateService, { optional: true });

  placeholderFor(key: string): string {
    return resolvePlaceholder(this.#translate, this.showPlaceholders(), key);
  }

  /** The bullet-points hint is a multi-line example — one muted row per line. */
  bulletPlaceholderLines(): string[] {
    const text = this.placeholderFor(this.KEYS.bulletPointsPlaceholder);
    return text === '' ? [] : text.split('\n');
  }

  hasMultipleInfoCards(): boolean {
    return this.block().props.cards.length > 1;
  }

  resolveAccent(card: InfoCard): string {
    return resolveCardAccent(card);
  }

  ctaFg(accent: string): string {
    return contrastTextForBackground(accent);
  }

  readableAccent(accent: string): string {
    return accentReadableOnWhite(accent);
  }

  bulletLines(card: InfoCard): string[] {
    return bulletLinesFromCard(card);
  }
}
