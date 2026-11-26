import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { resolvePlaceholder } from '../_shared/placeholder.util';
import { BlockOf } from '../../models/block.model';
import { EVENT_DETAILS_I18N } from './event-details.i18n-keys';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'app-db-event-details-canvas',
  standalone: true,
  styleUrl: './event-details-canvas.component.scss',
  templateUrl: './event-details-canvas.component.html',
})
export class EventDetailsCanvasComponent {
  readonly block = input.required<BlockOf<'eventDetails'>>();
  /** Editor-only: muted hints over empty text props. MUST stay `false` for export. */
  readonly showPlaceholders = input<boolean>(false);

  readonly KEYS = EVENT_DETAILS_I18N;

  readonly #translate = inject(TranslateService, { optional: true });

  placeholderFor(key: string): string {
    return resolvePlaceholder(this.#translate, this.showPlaceholders(), key);
  }
}
