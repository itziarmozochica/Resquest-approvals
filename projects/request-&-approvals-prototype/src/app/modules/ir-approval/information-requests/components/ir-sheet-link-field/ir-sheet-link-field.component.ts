import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { SheetPreviewTableComponent } from '@fz-original/app/modules/ir-approval/shared/components/sheet-preview-table/sheet-preview-table.component';
import { accessDeniedAccount } from '@fz-original/app/shared/utils/access-denied-account.util';
import { parseSheetUrl } from '@fz-original/app/shared/utils/google-sheet-url.util';
import { IgntButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { GOOGLE_SHEET_MIME_TYPE, InformationRequestFileAnswer } from '../../models/information-request-question.model';
import { InformationRequestsService } from '../../services/information-requests.service';

type SheetLinkErrorKey =
  | 'invalidSheetUrl'
  | 'duplicate'
  | 'accessDenied'
  | 'notFound'
  | 'officeFileNotSupported'
  | 'loadFailed'
  | 'missingContext';

/**
 * "Paste a Google Sheet link" option for file questions: verifies the integration account has read+write
 * access on the backend (blocking the add when it does not) and renders a read-only preview of the sheet
 * inline. Verified sheets are surfaced to the host as {@link InformationRequestFileAnswer} entries.
 */
@Component({
  selector: 'app-ir-sheet-link-field',
  standalone: true,
  imports: [FormsModule, TranslateModule, IgntButtonComponent, SheetPreviewTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ir-sheet-link-field.component.html',
  styleUrls: ['./ir-sheet-link-field.component.scss'],
})
export class IrSheetLinkFieldComponent implements OnChanges {
  @Input() partnerId: number | null = null;
  @Input() launchId: string | null = null;
  @Input() informationRequestId: string | null = null;
  @Input() disabled = false;
  @Input() multiple = false;
  @Input() sheets: InformationRequestFileAnswer[] = [];
  @Input() testId = 'ir-sheet-link';

  @Output() sheetsChange = new EventEmitter<InformationRequestFileAnswer[]>();

  readonly draft = signal('');
  readonly loading = signal(false);
  readonly errorKey = signal<SheetLinkErrorKey | null>(null);
  readonly errorAccount = signal<string | null>(null);
  readonly previews = signal<Record<string, string[][]>>({});

  readonly #service = inject(InformationRequestsService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sheets']) {
      this.#fetchMissingPreviews();
    }
  }

  canAdd(): boolean {
    return !this.disabled && (this.multiple || this.sheets.length === 0);
  }

  previewFor(spreadsheetId: string): string[][] {
    return this.previews()[spreadsheetId] ?? [];
  }

  onDraftChange(value: string): void {
    this.draft.set(value);
    this.errorKey.set(null);
    this.errorAccount.set(null);
  }

  add(): void {
    if (this.disabled || this.loading()) {
      return;
    }
    const raw = this.draft().trim();
    if (!raw) {
      return;
    }
    const parsed = parseSheetUrl(raw);
    if (!parsed) {
      this.errorKey.set('invalidSheetUrl');
      return;
    }
    if (this.sheets.some(sheet => sheet.driveFileId === parsed.spreadsheetId)) {
      this.errorKey.set('duplicate');
      return;
    }
    const partnerId = this.partnerId;
    const launchId = this.launchId;
    const requestId = this.informationRequestId;
    if (partnerId === null || !launchId || !requestId) {
      this.errorKey.set('missingContext');
      return;
    }
    this.loading.set(true);
    this.errorKey.set(null);
    this.errorAccount.set(null);
    this.#service
      .loadSheetPreview(partnerId, launchId, requestId, raw)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        this.loading.set(false);
        if (response.error || !response.data) {
          this.errorKey.set(this.#mapError(response.error?.code));
          this.errorAccount.set(accessDeniedAccount(response.error));
          this.#cdr.markForCheck();
          return;
        }
        const data = response.data;
        const answer: InformationRequestFileAnswer = {
          driveFileId: data.spreadsheetId,
          webViewLink: raw,
          originalName: data.sheetName || raw,
          mimeType: GOOGLE_SHEET_MIME_TYPE,
          uploadedAt: new Date().toISOString(),
        };
        this.previews.update(current => ({ ...current, [data.spreadsheetId]: data.rows }));
        this.draft.set('');
        this.sheetsChange.emit([...this.sheets, answer]);
        this.#cdr.markForCheck();
      });
  }

  remove(spreadsheetId: string): void {
    if (this.disabled) {
      return;
    }
    this.previews.update(current => {
      const next = { ...current };
      delete next[spreadsheetId];
      return next;
    });
    this.sheetsChange.emit(this.sheets.filter(sheet => sheet.driveFileId !== spreadsheetId));
  }

  #fetchMissingPreviews(): void {
    const partnerId = this.partnerId;
    const launchId = this.launchId;
    const requestId = this.informationRequestId;
    if (partnerId === null || !launchId || !requestId) {
      return;
    }
    for (const sheet of this.sheets) {
      if (this.previews()[sheet.driveFileId] !== undefined) {
        continue;
      }
      // Seed an empty grid so repeated change cycles don't re-issue the same request.
      this.previews.update(current => ({ ...current, [sheet.driveFileId]: [] }));
      this.#service
        .loadSheetPreview(partnerId, launchId, requestId, sheet.webViewLink)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(response => {
          if (response.data) {
            this.previews.update(current => ({ ...current, [sheet.driveFileId]: response.data!.rows }));
            this.#cdr.markForCheck();
          }
        });
    }
  }

  #mapError(code: string | number | undefined): SheetLinkErrorKey {
    if (code === 'access_denied') {
      return 'accessDenied';
    }
    if (code === 'not_found') {
      return 'notFound';
    }
    if (code === 'invalid_request') {
      return 'invalidSheetUrl';
    }
    if (code === 'office_file_not_supported') {
      return 'officeFileNotSupported';
    }
    return 'loadFailed';
  }
}
