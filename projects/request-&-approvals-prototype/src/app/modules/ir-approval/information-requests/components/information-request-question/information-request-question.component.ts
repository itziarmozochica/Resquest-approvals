import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  forwardRef,
  inject,
  input,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, PristineChangeEvent, ReactiveFormsModule, type AbstractControl } from '@angular/forms';

import { FilePreviewDialogComponent } from '@fz-original/app/modules/ir-approval/shared/components/file-preview-dialog/file-preview-dialog.component';
import { FileThumbnailComponent } from '@fz-original/app/modules/ir-approval/shared/components/file-thumbnail/file-thumbnail.component';
import { PreviewFile } from '@fz-original/app/modules/ir-approval/shared/models/file-preview-dialog.model';
import { LocalFilePreviewStore } from '@fz-original/app/modules/ir-approval/shared/services/local-file-preview-store.service';
import { GooglePickerService } from '@fz-original/app/shared/services/google-picker/google-picker.service';
import { PickedFile } from '@fz-original/app/shared/services/google-picker/google-picker.types';
import { environment } from '@fz-original/environments/environment';
import { IgntButtonComponent } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { TranslateModule } from '@ngx-translate/core';
import { filter, Observable, Subscription } from 'rxjs';

import { parseCatalogGridBundle } from '../../models/catalog-grid-bundle.util';
import { extractProducts, ScheduleProduct } from '../../models/event-schedule-composer.model';
import { canViewFileAnswer } from '../../models/file-answer-view.util';
import {
  acceptsSpreadsheet,
  fileAnswerKey,
  fileAnswerSyncStatusKey,
  fileKindsToMimeTypes,
  GOOGLE_SHEET_MIME_TYPE,
  InformationRequestFileAnswer,
  InformationRequestQuestion,
  InformationRequestQuestionType,
  isFileAnswerInDrive,
} from '../../models/information-request-question.model';
import {
  buildQuestionValidators,
  buildTableRowControl,
  serializeQuestionControl,
  type IrEventScheduleFormGroup,
  type IrProductFormArray,
  type IrStepperFormArray,
  type IrTableRowsFormArray,
  type IrVenueFormGroup,
} from '../../models/ir-answers-form.util';
import { StepperRefAnswerValue, StepperTemplate } from '../../models/stepper-template.model';
import { IrCatalogKeyPipe } from '../../pipes/ir-catalog-key.pipe';
import { InformationRequestUploadService } from '../../services/information-request-upload.service';
import { IrFileSyncTrackerService } from '../../services/ir-file-sync-tracker.service';
import { ProductTaxRateOption, VenuePricing, VenuePricingService } from '../../services/venue-pricing.service';
import { CatalogGridColumn, IrCatalogGridAnswerComponent } from '../ir-catalog-grid-answer/ir-catalog-grid-answer.component';
import { IrDriveImportNoticesComponent } from '../ir-drive-import-notices/ir-drive-import-notices.component';
import { IrEventScheduleGridFieldComponent } from '../ir-event-schedule-grid-field/ir-event-schedule-grid-field.component';
import { IrFileTreeComponent } from '../ir-file-tree/ir-file-tree.component';
import { IrFileUploadComponent } from '../ir-file-upload/ir-file-upload.component';
import { IrProductCatalogEditorComponent } from '../ir-product-catalog-editor/ir-product-catalog-editor.component';
import { IrRichTextAnswerComponent } from '../ir-rich-text-answer/ir-rich-text-answer.component';
import { IrSheetLinkFieldComponent } from '../ir-sheet-link-field/ir-sheet-link-field.component';
import { IrStepperRefAnswerComponent, StepperRefConfig } from '../ir-stepper-ref-answer/ir-stepper-ref-answer.component';
import {
  IrTableRepeaterAnswerComponent,
  TableColumnType,
  TableRepeaterColumn,
} from '../ir-table-repeater-answer/ir-table-repeater-answer.component';
import { IrVenueAnswerComponent, VenueAnswer } from '../ir-venue-answer/ir-venue-answer.component';

const PERCENTAGE_STEP = '0.01';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    IrCatalogKeyPipe,
    IgntInputFieldComponent,
    IgntRadioGroupComponent,
    IgntRadioComponent,
    IgntCheckboxComponent,
    IgntButtonComponent,
    IrRichTextAnswerComponent,
    IrTableRepeaterAnswerComponent,
    IrCatalogGridAnswerComponent,
    IrEventScheduleGridFieldComponent,
    IrProductCatalogEditorComponent,
    IrVenueAnswerComponent,
    IrFileTreeComponent,
    IrFileUploadComponent,
    IrDriveImportNoticesComponent,
    IrSheetLinkFieldComponent,
    FilePreviewDialogComponent,
    FileThumbnailComponent,
    forwardRef(() => IrStepperRefAnswerComponent),
  ],
  selector: 'app-information-request-question',
  standalone: true,
  styleUrls: ['./information-request-question.component.scss'],
  templateUrl: './information-request-question.component.html',
})
export class InformationRequestQuestionComponent implements OnChanges {
  @Input({ required: true }) question!: InformationRequestQuestion;
  @Input({ required: true }) control!: AbstractControl;
  @Input() partnerId: number | null = null;
  @Input() launchId: string | null = null;
  @Input() informationRequestId: string | null = null;
  @Input() referencedStepperTemplates: Record<string, StepperTemplate> = {};
  /** Answers of sibling questions in the same wizard instance, keyed by question id. */
  @Input() siblingAnswers: Record<string, unknown> = {};
  readonly locked = input<boolean>(false);

  @Output() siblingAnswerChange = new EventEmitter<{ questionId: string; value: unknown }>();
  @Output() fileUploaded = new EventEmitter<string>();

  readonly QuestionType = InformationRequestQuestionType;
  readonly isFileAnswerInDrive = isFileAnswerInDrive;

  readonly #previews = inject(LocalFilePreviewStore);

  protected localPreview(file: InformationRequestFileAnswer): string | undefined {
    return this.#previews.get(fileAnswerKey(file));
  }
  readonly fileAnswerKey = fileAnswerKey;
  readonly drivePickerAvailable = !!(environment.googlePickerClientId && environment.googlePickerApiKey && environment.googlePickerAppId);
  readonly percentageStep = PERCENTAGE_STEP;

  readonly #destroyRef = inject(DestroyRef);
  readonly #cdr = inject(ChangeDetectorRef);
  readonly #fileSyncTracker = inject(IrFileSyncTrackerService, { optional: true });
  #controlValueSubscription: Subscription | null = null;
  #controlPristineSubscription: Subscription | null = null;
  readonly #picker = inject(GooglePickerService);
  readonly #uploadService = inject(InformationRequestUploadService);
  readonly #venuePricingService = inject(VenuePricingService);

  readonly #composerVenuePricing = signal<VenuePricing | null>(null);
  #composerPricedPlaceId: string | null = null;
  #enrichedVenue: { venue: VenueAnswer | null; pricing: VenuePricing | null; result: VenueAnswer | null } | null = null;

  pickerOpen = false;
  pickerError: string | null = null;
  readonly #previewFile = signal<PreviewFile | null>(null);
  protected readonly previewFile = this.#previewFile.asReadonly();
  readonly #hasViewError = signal<boolean>(false);
  protected readonly hasViewError = this.#hasViewError.asReadonly();
  readonly pendingDeleteFiles = signal<InformationRequestFileAnswer[]>([]);
  readonly answeredImportJobIds = signal<readonly string[]>([]);
  readonly viewingFileKey = signal<string | null>(null);

  catalogGridColumns(): CatalogGridColumn[] {
    const meta = this.question.compositeMetadata ?? null;
    const raw = (meta?.['grid_columns'] as Array<Record<string, unknown>> | undefined) ?? [];
    const picklists = (meta?.['table_column_picklists'] as Record<string, string[]> | undefined) ?? {};
    return raw.map(c => {
      const id = String(c['id'] ?? '');
      const type = this.#normalizeColumnType(String(c['type'] ?? 'text'));
      return {
        defaultRequired: Boolean(c['defaultRequired']),
        helpText: typeof c['helpText'] === 'string' ? (c['helpText'] as string) : undefined,
        id,
        label: String(c['label'] ?? id),
        options: type === 'picklist' ? (picklists[id] ?? []) : undefined,
        type,
      };
    });
  }

  formControl(): FormControl<unknown> {
    return this.control as FormControl<unknown>;
  }

  venueControl(): IrVenueFormGroup | null {
    return this.control instanceof FormGroup ? (this.control as IrVenueFormGroup) : null;
  }

  tableRowsControl(): IrTableRowsFormArray | null {
    if (this.control instanceof FormGroup && this.control.controls['rows'] instanceof FormArray) {
      return this.control.controls['rows'] as IrTableRowsFormArray;
    }
    return this.control instanceof FormArray ? (this.control as IrTableRowsFormArray) : null;
  }

  eventScheduleControl(): IrEventScheduleFormGroup {
    return this.control as IrEventScheduleFormGroup;
  }

  productCatalogControl(): IrProductFormArray | null {
    return this.control instanceof FormArray ? (this.control as IrProductFormArray) : null;
  }

  stepperControl(): IrStepperFormArray | null {
    return this.control instanceof FormArray ? (this.control as IrStepperFormArray) : null;
  }

  catalogGridMinRows(): number {
    const meta = this.question.compositeMetadata ?? null;
    const value = meta?.['grid_min_rows'];
    return typeof value === 'number' && value > 0 ? value : 0;
  }

  errorKey(): string | null {
    const c = this.control;
    if (!c.touched && !c.dirty) {
      return null;
    }
    if (c.hasError('required')) {
      return 'required';
    }
    if (c.hasError('min')) {
      return 'min';
    }
    if (c.hasError('max')) {
      return 'max';
    }
    if (c.hasError('email') || c.hasError('emailPattern')) {
      return 'email';
    }
    if (c.hasError('urlPattern')) {
      return 'url';
    }
    if (c.hasError('phonePattern')) {
      return 'phone';
    }
    if (c.hasError('pattern')) {
      return 'pattern';
    }
    if (c.hasError('minlength')) {
      return 'minLength';
    }
    if (c.hasError('maxlength')) {
      return 'maxLength';
    }
    if (c.hasError('minFiles')) {
      return 'minFiles';
    }
    if (c.hasError('multipleRequired')) {
      return 'required';
    }
    return null;
  }

  errorParams(): Record<string, unknown> {
    const minFiles = this.control.errors?.['minFiles'] as { required?: number } | undefined;
    return minFiles?.required != null ? { min: minFiles.required } : {};
  }

  /** This question's answer as a JSON string (e.g. the schedule v2 bundle). */
  eventScheduleAnswerJson(): string {
    const value = serializeQuestionControl(this.question, this.control, { referencedStepperTemplates: this.referencedStepperTemplates });
    if (typeof value === 'string') return value;
    return JSON.stringify(value ?? []);
  }

  /** Whether this grid field opts into the event-schedule calendar composer (config-driven via metadata). */
  eventScheduleComposerEnabled(): boolean {
    return this.question.compositeMetadata?.['grid_composer'] === 'event_schedule';
  }

  /** Products for the composer, sourced from a sibling ticket-types answer named in metadata. */
  eventScheduleProducts(): ScheduleProduct[] {
    const meta = this.question.compositeMetadata ?? null;
    const sourceId = meta?.['product_source_field_id'];
    const nameColumn = typeof meta?.['product_name_column'] === 'string' ? (meta['product_name_column'] as string) : undefined;
    if (typeof sourceId !== 'string' || !sourceId) return [];
    return extractProducts(this.siblingAnswers[sourceId], nameColumn);
  }

  productCatalogCurrency(): string {
    return this.eventScheduleVenueValue()?.currency ?? '';
  }

  productCatalogMustUseTaxBase(): boolean {
    return this.eventScheduleVenueValue()?.mustUseTaxBase ?? false;
  }

  productCatalogTaxRates(): ProductTaxRateOption[] {
    return this.eventScheduleVenueValue()?.productTaxRates ?? [];
  }

  eventScheduleVenueEnabled(): boolean {
    return this.eventScheduleVenueQuestionId() !== null;
  }

  eventScheduleVenueQuestionId(): string | null {
    const sourceId = this.question.compositeMetadata?.['venue_source_field_id'];
    return typeof sourceId === 'string' && sourceId.trim() ? sourceId.trim() : null;
  }

  eventScheduleVenueValue(): VenueAnswer | null {
    const venue = this.#rawVenueAnswer();
    const pricing = this.#composerVenuePricing();
    if (this.#enrichedVenue && this.#enrichedVenue.venue === venue && this.#enrichedVenue.pricing === pricing) {
      return this.#enrichedVenue.result;
    }
    const result =
      venue && pricing
        ? { ...venue, currency: pricing.currency, mustUseTaxBase: pricing.mustUseTaxBase, productTaxRates: pricing.productTaxRates }
        : venue;
    this.#enrichedVenue = { pricing, result, venue };
    return result;
  }

  #rawVenueAnswer(): VenueAnswer | null {
    const sourceId = this.eventScheduleVenueQuestionId();
    if (!sourceId) return null;
    const value = this.siblingAnswers[sourceId];
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as VenueAnswer) : null;
  }

  #refreshComposerVenuePricing(): void {
    if (!this.eventScheduleComposerEnabled()) return;
    const placeId = this.#rawVenueAnswer()?.placeId?.trim();
    if (!placeId || this.partnerId === null || placeId === this.#composerPricedPlaceId) return;
    this.#composerPricedPlaceId = placeId;
    this.#venuePricingService
      .getByGooglePlaceId(this.partnerId, placeId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(pricing => {
        if (pricing === null) {
          // Failed fetch: leave pricing unresolved and clear the guard so a later change retries.
          this.#composerPricedPlaceId = null;
          return;
        }
        this.#composerVenuePricing.set(pricing);
        this.#cdr.markForCheck();
      });
  }

  fileSyncStatusKey(file: InformationRequestFileAnswer): string {
    return fileAnswerSyncStatusKey(file, {
      fromDriveLink: this.#fileSyncTracker?.isDriveLinkFile(file) ?? false,
      stalled: this.#fileSyncTracker?.isFileStalled(file) ?? false,
    });
  }

  isDisabled(): boolean {
    return this.control.disabled || this.locked();
  }

  files(): InformationRequestFileAnswer[] {
    const value = this.control.value;
    if (this.question.type === InformationRequestQuestionType.MULTIFILE) {
      return Array.isArray(value) ? (value as InformationRequestFileAnswer[]) : [];
    }
    return value ? [value as InformationRequestFileAnswer] : [];
  }

  /** File answers backed by uploaded/Drive-picked files (everything that is not a pasted sheet link). */
  nonSheetFiles(): InformationRequestFileAnswer[] {
    return this.files().filter(file => file.mimeType !== GOOGLE_SHEET_MIME_TYPE);
  }

  /** File answers that are pasted Google Sheet links, rendered by the sheet-link sub-field. */
  sheetFiles(): InformationRequestFileAnswer[] {
    return this.files().filter(file => file.mimeType === GOOGLE_SHEET_MIME_TYPE);
  }

  fileAccept(): string[] | null {
    const accept = this.question.compositeMetadata?.['file_accept'];
    return Array.isArray(accept) && accept.length > 0 ? (accept as string[]) : null;
  }

  /** Whether to offer the "paste a Google Sheet link" option on this file question. */
  showSheetLink(): boolean {
    if (this.partnerId === null || !this.launchId || !this.informationRequestId) {
      return false;
    }
    if (!acceptsSpreadsheet(this.question.acceptedFileKinds)) {
      return false;
    }
    if (this.question.type === InformationRequestQuestionType.FILE) {
      return this.nonSheetFiles().length === 0;
    }
    return true;
  }

  onFileUploaded(): void {
    this.fileUploaded.emit(this.question.id);
  }

  onSheetsChange(sheets: InformationRequestFileAnswer[]): void {
    if (this.question.type === InformationRequestQuestionType.MULTIFILE) {
      const merged = [...this.nonSheetFiles(), ...sheets];
      this.#setControlValue(merged.length > 0 ? merged : null);
    } else {
      this.#setControlValue(sheets[0] ?? this.nonSheetFiles()[0] ?? null);
    }
  }

  /** Column ids for the event-schedule host field (drives which generated columns it fills). */
  gridColumnIds(): string[] {
    return this.catalogGridColumns().map(c => c.id);
  }

  hasGridColumn(id: string): boolean {
    return this.catalogGridColumns().some(c => c.id === id);
  }

  isMultiOptionSelected(option: string): boolean {
    const current = this.control.value;
    return Array.isArray(current) && (current as string[]).includes(option);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['question'] || changes['control']) {
      this.#applyValidators();
      this.#refreshAnsweredImportJobIds();
    }
    if (changes['control']) {
      this.#controlValueSubscription?.unsubscribe();
      this.#controlValueSubscription = this.control.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.#refreshAnsweredImportJobIds();
        this.#cdr.markForCheck();
      });
      this.#controlPristineSubscription?.unsubscribe();
      this.#controlPristineSubscription = this.control.events
        .pipe(
          filter((event): event is PristineChangeEvent => event instanceof PristineChangeEvent && event.pristine),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe(() => {
          this.#setPendingDeleteFiles([]);
          this.#cdr.markForCheck();
        });
    }
    if (changes['question']) {
      const previous = changes['question'].previousValue as InformationRequestQuestion | undefined;
      if (previous?.id !== this.question.id) {
        this.#setPendingDeleteFiles([]);
      }
    }
    this.#refreshComposerVenuePricing();
  }

  onEventScheduleAnswerChange(json: string): void {
    if (this.control instanceof FormGroup && this.control.controls['rows'] instanceof FormArray) {
      const bundle = parseCatalogGridBundle(json);
      const rows = this.control.controls['rows'] as IrTableRowsFormArray;
      rows.clear();
      (bundle?.rows ?? []).forEach(row => rows.push(buildTableRowControl(row, this.gridColumnIds())));
      const meta = this.control.controls['meta'];
      if (meta instanceof FormControl) {
        meta.setValue(bundle?.meta ?? {});
        meta.markAsDirty();
      }
      rows.markAsDirty();
      this.control.markAsDirty();
      this.control.updateValueAndValidity();
      return;
    }
    this.#setControlValue(json);
  }

  onEventScheduleVenueChange(venue: VenueAnswer): void {
    const sourceId = this.eventScheduleVenueQuestionId();
    if (!sourceId) return;
    this.siblingAnswerChange.emit({ questionId: sourceId, value: venue });
  }

  onRichTextChange(value: string): void {
    this.#setControlValue(value);
  }

  async pickFile(): Promise<void> {
    if (this.isDisabled() || this.pickerOpen) {
      return;
    }
    this.pickerOpen = true;
    this.pickerError = null;
    try {
      const picked = await this.#picker.open({
        acceptedMimeTypes: fileKindsToMimeTypes(this.question.acceptedFileKinds),
      });
      if (picked) {
        this.#applyPickedFile(picked);
      }
    } catch (err) {
      this.pickerError = err instanceof Error ? err.message : 'picker_error';
    } finally {
      this.pickerOpen = false;
      this.#cdr.markForCheck();
    }
  }

  removeFile(key: string): void {
    const removed = this.files().find(f => fileAnswerKey(f) === key) ?? null;
    if (this.question.type === InformationRequestQuestionType.MULTIFILE) {
      const next = this.files().filter(f => fileAnswerKey(f) !== key);
      this.#setControlValue(next.length > 0 ? next : null);
    } else {
      this.#setControlValue(null);
    }
    if (removed) {
      this.#setPendingDeleteFiles([...this.pendingDeleteFiles(), removed]);
    }
  }

  restoreFile(key: string): void {
    const file = this.pendingDeleteFiles().find(f => fileAnswerKey(f) === key);
    if (!file || !this.canRestoreFile()) {
      return;
    }
    this.#setPendingDeleteFiles(this.pendingDeleteFiles().filter(f => fileAnswerKey(f) !== key));
    if (this.question.type === InformationRequestQuestionType.MULTIFILE) {
      this.#setControlValue([...this.files(), file]);
    } else {
      this.#setControlValue(file);
    }
  }

  canRestoreFile(): boolean {
    return this.question.type === InformationRequestQuestionType.MULTIFILE || this.files().length === 0;
  }

  protected canViewFile(file: InformationRequestFileAnswer): boolean {
    return canViewFileAnswer(file);
  }

  protected viewFile(file: InformationRequestFileAnswer): void {
    this.#hasViewError.set(false);
    const importJobId = file.importJobId ?? '';
    if (importJobId === '') {
      this.#openDrivePreview(file);
      return;
    }
    const partnerId = this.partnerId;
    const informationRequestId = this.informationRequestId ?? '';
    if (partnerId === null || informationRequestId === '' || this.viewingFileKey() !== null) {
      return;
    }
    const launchId = this.launchId;
    const questionId = this.question.id;
    const fetchUrl = (): Observable<string> =>
      this.#uploadService.fetchFileUrl(partnerId, launchId, informationRequestId, questionId, importJobId);
    this.viewingFileKey.set(fileAnswerKey(file));
    fetchUrl()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: url => {
          this.viewingFileKey.set(null);
          this.#previewFile.set({
            driveFileId: '',
            mimeType: file.mimeType,
            originalName: file.originalName,
            refreshSignedUrl: fetchUrl,
            signedUrl: url,
            webViewLink: isFileAnswerInDrive(file) ? file.webViewLink : '',
          });
        },
        error: () => {
          this.viewingFileKey.set(null);
          this.#openDrivePreview(file);
        },
      });
  }

  #openDrivePreview(file: InformationRequestFileAnswer): void {
    if (!isFileAnswerInDrive(file)) {
      this.#hasViewError.set(true);
      return;
    }
    this.#previewFile.set({
      driveFileId: file.driveFileId,
      mimeType: file.mimeType,
      originalName: file.originalName,
      webViewLink: file.webViewLink,
    });
  }

  closePreview(): void {
    this.#previewFile.set(null);
  }

  stepperRefConfig(): StepperRefConfig {
    return {
      multiInstance: !!this.question.multiInstance,
      stepperTemplateKey: this.question.stepperTemplateKey ?? '',
    };
  }

  stepperRefTemplate(): StepperTemplate | null {
    const key = this.question.stepperTemplateKey;
    if (!key) return null;
    return this.referencedStepperTemplates[key] ?? null;
  }

  stepperRefValue(): StepperRefAnswerValue | null {
    const v = this.control.value;
    if (v === null || v === undefined) return null;
    if (Array.isArray(v)) return v as StepperRefAnswerValue;
    if (typeof v === 'object') return v as StepperRefAnswerValue;
    return null;
  }

  tableRepeaterColumns(): TableRepeaterColumn[] {
    return this.#buildTableColumns();
  }

  toggleMultiOption(option: string, checked: boolean): void {
    const current = Array.isArray(this.control.value) ? (this.control.value as string[]) : [];
    const next = checked ? Array.from(new Set([...current, option])) : current.filter(o => o !== option);
    this.#setControlValue(next);
  }

  #applyPickedFile(picked: PickedFile): void {
    const answer: InformationRequestFileAnswer = {
      driveFileId: picked.id,
      mimeType: picked.mimeType,
      originalName: picked.name,
      uploadedAt: new Date().toISOString(),
      webViewLink: picked.url,
    };
    if (this.question.type === InformationRequestQuestionType.MULTIFILE) {
      const current = this.files();
      if (current.some(f => f.driveFileId === answer.driveFileId)) {
        return;
      }
      this.#setControlValue([...current, answer]);
    } else {
      this.#setControlValue(answer);
    }
  }

  #refreshAnsweredImportJobIds(): void {
    const ids = this.files()
      .map(file => file.importJobId)
      .filter((id): id is string => !!id);
    const current = this.answeredImportJobIds();
    if (ids.length !== current.length || ids.some((id, index) => id !== current[index])) {
      this.answeredImportJobIds.set(ids);
    }
  }

  #setControlValue(value: unknown): void {
    this.control.markAsDirty();
    if (this.control instanceof FormControl) {
      this.control.setValue(value);
    }
  }

  #setPendingDeleteFiles(files: InformationRequestFileAnswer[]): void {
    this.pendingDeleteFiles.set(files);
    this.#fileSyncTracker?.setPendingDeletions(
      this.question.id,
      files.map(file => file.originalName),
    );
  }

  #applyValidators(): void {
    this.control.setValidators(buildQuestionValidators(this.question));
    this.control.updateValueAndValidity({ emitEvent: false });
    this.#cdr.markForCheck();
  }

  #buildTableColumns(): TableRepeaterColumn[] {
    const meta = this.question.compositeMetadata ?? null;
    const types = (meta?.['table_column_types'] as Record<string, string> | undefined) ?? {};
    const picklists = (meta?.['table_column_picklists'] as Record<string, string[]> | undefined) ?? {};
    const isFaq = this.question.type === InformationRequestQuestionType.FAQ;
    const faqLabels: Record<string, string> = { q: 'Question', a: 'Answer' };
    return Object.entries(types).map(([id, type]) => {
      const normalized = this.#normalizeColumnType(type);
      return {
        id,
        label: isFaq && faqLabels[id] ? faqLabels[id] : this.#humanizeColumnId(id),
        options: normalized === 'picklist' ? (picklists[id] ?? []) : undefined,
        type: normalized,
      };
    });
  }

  #humanizeColumnId(id: string): string {
    return id
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  #normalizeColumnType(raw: string): TableColumnType {
    const lower = raw.toLowerCase();
    if (
      lower === 'textarea' ||
      lower === 'number' ||
      lower === 'percentage' ||
      lower === 'date' ||
      lower === 'time' ||
      lower === 'picklist'
    ) {
      return lower;
    }
    return 'text';
  }
}
