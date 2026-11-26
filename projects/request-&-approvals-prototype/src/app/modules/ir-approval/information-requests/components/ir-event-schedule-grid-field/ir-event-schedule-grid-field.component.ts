import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import {
  EVENT_SCHEDULE_COMPOSER_META_KEY,
  mergeCatalogGridBundleMeta,
  parseCatalogGridBundle,
} from '../../models/catalog-grid-bundle.util';
import { buildScheduleRowsFromComposer, parseEventScheduleComposerMeta } from '../../models/event-schedule-composer-v1.helpers';
import { EventScheduleComposerStateV1, ProductRow } from '../../models/event-schedule-composer-v1.model';
import { IrNamedDateRangesEditorComponent } from '../ir-named-date-ranges-editor/ir-named-date-ranges-editor.component';
import { IrScheduleBulkCalendarComponent } from '../ir-schedule-bulk-calendar/ir-schedule-bulk-calendar.component';
import { VenueAnswer } from '../ir-venue-answer/ir-venue-answer.component';

/**
 * Full-parity host for the event-schedule composer: edits named date-range bands (wizard), shows a
 * read-only calendar overview, and round-trips the composer state through the catalog-grid answer as a
 * `{ v:2, rows, meta.eventScheduleComposer }` bundle (rows are regenerated from the composer on every edit).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IrNamedDateRangesEditorComponent, IrScheduleBulkCalendarComponent],
  selector: 'app-ir-event-schedule-grid-field',
  standalone: true,
  styleUrls: ['./ir-event-schedule-grid-field.component.scss'],
  templateUrl: './ir-event-schedule-grid-field.component.html',
})
export class IrEventScheduleGridFieldComponent {
  /** Current catalog-grid answer JSON (legacy rows array or a v2 bundle). */
  readonly answer = input<string>('');
  /** Sellable products derived from the sibling ticket-types answer. */
  readonly allProducts = input<ProductRow[]>([]);
  /** Catalog-grid column ids — used to decide which generated columns to fill (pricingTier). */
  readonly gridColumnIds = input<string[]>([]);
  /** Enables the venue step when this schedule belongs to a form/stepper that also has a venue question. */
  readonly venueEnabled = input<boolean>(false);
  /** Current venue answer from the sibling venue question. */
  readonly venueValue = input<VenueAnswer | null>(null);

  readonly answerChange = output<string>();
  readonly venueChange = output<VenueAnswer>();

  readonly currency = computed<string>(() => this.venueValue()?.currency ?? '');

  readonly composer = computed<EventScheduleComposerStateV1>(() => {
    const bundle = parseCatalogGridBundle(this.answer());
    return parseEventScheduleComposerMeta(bundle?.meta?.[EVENT_SCHEDULE_COMPOSER_META_KEY]);
  });

  readonly #hasPricingTier = computed<boolean>(() => this.gridColumnIds().includes('pricingTier'));

  onComposerChange(composer: EventScheduleComposerStateV1): void {
    const rows = buildScheduleRowsFromComposer(composer, { hasPricingTier: this.#hasPricingTier() });
    // Replace the generated rows and persist the composer under meta so it round-trips on reload.
    const withRows = JSON.stringify(rows);
    const merged = mergeCatalogGridBundleMeta(withRows, { [EVENT_SCHEDULE_COMPOSER_META_KEY]: composer });
    this.answerChange.emit(merged);
  }

  onVenueChange(venue: VenueAnswer): void {
    this.venueChange.emit(venue);
  }
}
