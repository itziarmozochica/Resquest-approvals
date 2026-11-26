import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';

import { IgntButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { ApprovalsService } from '../../services/approvals.service';
import {
  isSheetBasedSubtype,
  isUrlBasedSubtype,
  parseSheetUrl,
  PartnerReviewMode,
  SheetTab,
  UrlListEntry,
} from './subtype-payload-editor.types';
import {
  ApprovalSubtypePayloadFormGroup,
  buildSubtypePayloadForm,
  createUrlEntryGroup,
  SheetPayloadFormValue,
} from './subtype-payload-form.util';

@Component({
  selector: 'app-subtype-payload-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, IgntButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subtype-payload-editor.component.html',
  styleUrls: ['./subtype-payload-editor.component.scss'],
})
export class SubtypePayloadEditorComponent {
  @Input() subtype = '';
  @Input() partnerId: number | null = null;
  @Input() launchId: string | null = null;
  @Input({ required: true }) form: ApprovalSubtypePayloadFormGroup = buildSubtypePayloadForm();

  readonly sheetTabs = signal<SheetTab[]>([]);
  readonly sheetUrlError = signal<string | null>(null);
  readonly sheetLoading = signal<boolean>(false);
  readonly urlDraft = signal<string>('');
  readonly urlError = signal<string | null>(null);

  readonly #destroyRef = inject(DestroyRef);
  readonly #approvalsService = inject(ApprovalsService);

  readonly isUrlBased = (): boolean => isUrlBasedSubtype(this.subtype);
  readonly isSheetBased = (): boolean => isSheetBasedSubtype(this.subtype);

  entries(): UrlListEntry[] {
    return this.form.controls.urlEntries.getRawValue();
  }

  sheetTabId(): number {
    return this.form.controls.sheet.controls.sheetTabId.value;
  }

  sheetName(): string {
    return this.form.controls.sheet.controls.sheetName.value;
  }

  sheetPreviewRows(): string[][] {
    return this.form.controls.sheet.controls.sheetPreviewRows.value;
  }

  visiblePreviewDataRows(): string[][] {
    return this.sheetPreviewRows()
      .slice(1)
      .filter(row => row.some(cell => (cell ?? '').trim().length > 0));
  }

  sheetClientCommentsColIndex(): number {
    return this.form.controls.sheet.controls.clientCommentsColIndex.value;
  }

  hiddenColumns(): number[] {
    return this.form.controls.sheet.controls.hiddenColumns.value;
  }

  sheetUrl(): string {
    return this.form.controls.sheet.controls.spreadsheetUrl.value;
  }

  spreadsheetId(): string {
    return this.form.controls.sheet.controls.spreadsheetId.value;
  }

  disabled(): boolean {
    return this.form.disabled;
  }

  isColumnHidden(index: number): boolean {
    return this.hiddenColumns().includes(index);
  }

  eventValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  toggleColumnHidden(index: number): void {
    if (this.disabled()) {
      return;
    }
    const current = this.hiddenColumns();
    const next = current.includes(index) ? current.filter(i => i !== index) : [...current, index].sort((a, b) => a - b);
    this.form.controls.sheet.controls.hiddenColumns.setValue(next);
    this.#markDirty();
  }

  onUrlDraftChange(value: string): void {
    this.urlDraft.set(value);
    this.urlError.set(null);
  }

  addUrl(): void {
    if (this.disabled()) {
      return;
    }
    const raw = this.urlDraft().trim();
    if (!raw) {
      return;
    }
    if (!this.#isValidUrl(raw)) {
      this.urlError.set('invalidUrl');
      return;
    }
    if (this.entries().some(entry => entry.url === raw)) {
      this.urlError.set('duplicateUrl');
      return;
    }
    this.form.controls.urlEntries.push(createUrlEntryGroup({ url: raw, mode: 'approve', description: '' }));
    this.urlDraft.set('');
    this.#markDirty();
  }

  removeUrl(index: number): void {
    if (this.disabled()) {
      return;
    }
    this.form.controls.urlEntries.removeAt(index);
    this.#markDirty();
  }

  setMode(index: number, mode: PartnerReviewMode | string): void {
    if (this.disabled()) {
      return;
    }
    if (mode !== 'approve' && mode !== 'inform') {
      return;
    }
    const group = this.form.controls.urlEntries.at(index);
    if (!group) {
      return;
    }
    group.controls.mode.setValue(mode);
    this.#markDirty();
  }

  setAllModes(mode: PartnerReviewMode): void {
    if (this.disabled() || !this.entries().length) {
      return;
    }
    this.form.controls.urlEntries.controls.forEach(group => group.controls.mode.setValue(mode));
    this.#markDirty();
  }

  onDescriptionChange(index: number, value: string): void {
    if (this.disabled()) {
      return;
    }
    const group = this.form.controls.urlEntries.at(index);
    if (!group) {
      return;
    }
    group.controls.description.setValue(value);
    this.#markDirty();
  }

  onSheetUrlChange(value: string): void {
    if (this.disabled()) {
      return;
    }
    this.form.controls.sheet.controls.spreadsheetUrl.setValue(value);
    const trimmed = value.trim();
    if (!trimmed) {
      this.#patchSheet({
        spreadsheetId: '',
        sheetTabId: 0,
      });
      this.#clearSheetPreview();
      this.sheetUrlError.set(null);
      this.#markDirty();
      return;
    }
    const parsed = parseSheetUrl(trimmed);
    if (!parsed) {
      this.#patchSheet({ spreadsheetId: '' });
      this.#clearSheetPreview();
      this.sheetUrlError.set('invalidSheetUrl');
      this.#markDirty();
      return;
    }
    this.sheetUrlError.set(null);
    this.#patchSheet({
      spreadsheetId: parsed.spreadsheetId,
      sheetTabId: parsed.gid,
    });
    this.#clearSheetPreview();
    this.#markDirty();
  }

  onSheetTabChange(value: string): void {
    if (this.disabled()) {
      return;
    }
    const id = Number(value);
    if (!Number.isFinite(id) || id < 0) {
      return;
    }
    const tab = this.sheetTabs().find(item => item.sheetTabId === id);
    this.#patchSheet({
      sheetTabId: id,
      sheetName: tab?.title ?? '',
      sheetPreviewRows: [],
      rowCount: 0,
      colCount: 0,
      hiddenColumns: [],
    });
    this.#markDirty();
  }

  loadSheetPreview(): void {
    if (this.disabled() || this.sheetLoading()) {
      return;
    }
    const partnerId = this.partnerId;
    const launchId = this.launchId;
    const url = this.sheetUrl().trim();
    const parsed = parseSheetUrl(url);
    if (!parsed) {
      this.sheetUrlError.set('invalidSheetUrl');
      return;
    }
    if (partnerId === null) {
      this.sheetUrlError.set('missingLaunch');
      return;
    }
    this.sheetLoading.set(true);
    this.sheetUrlError.set(null);
    this.#approvalsService
      .listSpreadsheetTabs(partnerId, launchId, url)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          if (response.error || !response.data?.length) {
            this.sheetLoading.set(false);
            this.sheetUrlError.set(this.#mapSheetError(response.error?.code));
            this.#patchSheet({ sheetPreviewRows: [], rowCount: 0, colCount: 0 });
            this.#markDirty();
            return;
          }
          this.#loadSheetPreviewForTab(partnerId, launchId, url, response.data);
        },
        error: () => this.#handleSheetLoadError(),
      });
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  #isValidUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  #loadSheetPreviewForTab(partnerId: number, launchId: string | null, url: string, tabs: SheetTab[]): void {
    this.sheetTabs.set(tabs);
    const selectedTab = tabs.find(tab => tab.sheetTabId === this.sheetTabId()) ?? tabs[0];
    if (!selectedTab) {
      this.#handleSheetLoadError();
      return;
    }
    this.#patchSheet({ sheetTabId: selectedTab.sheetTabId, sheetName: selectedTab.title });
    this.#approvalsService
      .loadSpreadsheetPreview(partnerId, launchId, url, selectedTab.sheetTabId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          this.sheetLoading.set(false);
          if (response.error || !response.data) {
            this.sheetUrlError.set(this.#mapSheetError(response.error?.code));
            this.#patchSheet({ sheetPreviewRows: [], rowCount: 0, colCount: 0 });
            this.#markDirty();
            return;
          }
          this.#patchSheet({
            sheetPreviewRows: response.data.rows,
            rowCount: response.data.rows.length,
            colCount: response.data.rows[0]?.length ?? 0,
            clientCommentsColIndex: response.data.clientCommentsColIndex,
          });
          this.#markDirty();
        },
        error: () => this.#handleSheetLoadError(),
      });
  }

  #handleSheetLoadError(): void {
    this.sheetLoading.set(false);
    this.sheetUrlError.set('loadFailed');
    this.#patchSheet({ sheetPreviewRows: [], rowCount: 0, colCount: 0 });
    this.#markDirty();
  }

  #mapSheetError(code: string | number | undefined): string {
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

  #clearSheetPreview(): void {
    this.sheetTabs.set([]);
    this.#patchSheet({
      sheetName: '',
      sheetPreviewRows: [],
      rowCount: 0,
      colCount: 0,
      clientCommentsColIndex: -1,
      hiddenColumns: [],
    });
  }

  #patchSheet(value: Partial<SheetPayloadFormValue>): void {
    this.form.controls.sheet.patchValue(value);
  }

  #markDirty(): void {
    this.form.markAsDirty();
    this.form.updateValueAndValidity();
  }
}
