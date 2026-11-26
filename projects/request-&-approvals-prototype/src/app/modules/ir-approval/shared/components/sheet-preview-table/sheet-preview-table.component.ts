import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Read-only renderer for a Google Sheet grid: first row is the header, the rest are body rows. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-sheet-preview-table',
  standalone: true,
  styleUrl: './sheet-preview-table.component.scss',
  templateUrl: './sheet-preview-table.component.html',
})
export class SheetPreviewTableComponent {
  readonly rows = input<string[][]>([]);
  readonly testId = input<string>('sheet-preview-table');

  readonly headerRow = computed<string[]>(() => this.rows()[0] ?? []);
  readonly bodyRows = computed<string[][]>(() => this.rows().slice(1));
}
