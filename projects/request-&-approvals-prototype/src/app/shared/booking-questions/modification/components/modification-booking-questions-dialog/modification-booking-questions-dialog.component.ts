import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';

import { BookingQuestionsService } from '@fz-original/app/shared/booking-questions/booking-questions.service';
import { BookingQuestionsFormData } from '@fz-original/app/shared/booking-questions/models';
import { BookingQuestionsFormGroupModule } from '@fz-original/app/shared/booking-questions/modules/form-group/form-group.module';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';
import { merge, Subscription } from 'rxjs';

import {
  applyAnswersPrefillToFormGroup,
  applyKeptPrefillToFormData,
  applyPrefillToQuestions,
  areKeptTicketAnswersComplete,
  areModificationBookingQuestionsAnswersComplete,
  areRemovalSelectionsComplete,
  buildTypeAwareSourceIndices,
  countSelectedRemovalsBySessionTypeId,
  markModificationBookingQuestionsRequired,
} from '../../utils/modification-booking-questions.util';
import {
  ModificationBookingQuestionsDialogData,
  ModificationBookingQuestionsDialogResult,
  ModificationBookingQuestionsDialogStep,
} from './modification-booking-questions-dialog.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BookingQuestionsFormGroupModule,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntDialogModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-modification-booking-questions-dialog',
  standalone: true,
  styleUrl: './modification-booking-questions-dialog.component.scss',
  templateUrl: './modification-booking-questions-dialog.component.html',
})
export class ModificationBookingQuestionsDialogComponent {
  readonly #bookingQuestionsService = inject(BookingQuestionsService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject<IgntDialogRef<ModificationBookingQuestionsDialogResult>>(IGNT_DIALOG_REF);
  protected readonly data = inject<ModificationBookingQuestionsDialogData>(IGNT_DIALOG_DATA);
  protected readonly step = signal<ModificationBookingQuestionsDialogStep>(this.data.removalsRequired === 0 ? 'answers' : 'removal');
  protected readonly formData = signal<BookingQuestionsFormData | null>(null);
  protected readonly formGroup = signal<UntypedFormGroup | null>(null);
  readonly #selectedRemovalSourceIndices = signal<ReadonlySet<number>>(new Set<number>());
  readonly #removalContinueAttempted = signal(false);
  readonly #answersConfirmAttempted = signal(false);
  readonly #answersSubmittable = signal(false);
  #formValiditySubscription: Subscription | null = null;
  /** Kept indices the current answers form was built for; skip rebuild when unchanged after back. */
  #builtKeptSourceIndices: Array<number | undefined> | null = null;

  protected readonly keptRows = computed(() => this.data.removalRows.filter(row => !row.removable && !row.autoRemoved));
  protected readonly removableRows = computed(() => this.data.removalRows.filter(row => row.removable && !row.autoRemoved));
  protected readonly selectedRemovalCount = computed(() => this.#selectedRemovalSourceIndices().size);
  readonly #selectedRemovalsBySessionTypeId = computed(() =>
    countSelectedRemovalsBySessionTypeId(this.data.removalRows, this.#selectedRemovalSourceIndices()),
  );
  protected readonly canContinueRemoval = computed(() =>
    areRemovalSelectionsComplete(this.data.removalsBySessionTypeId, this.#selectedRemovalsBySessionTypeId(), this.data.removalsRequired),
  );
  protected readonly showInvalidRemovalCount = computed(() => this.#removalContinueAttempted() && !this.canContinueRemoval());
  protected readonly canConfirmAnswers = computed(() => this.#answersSubmittable());
  protected readonly showIncompleteAnswersError = computed(() => this.#answersConfirmAttempted() && !this.canConfirmAnswers());
  protected readonly showBackButton = computed(() => this.data.removalsRequired > 0);

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.#formValiditySubscription?.unsubscribe();
    });

    if (this.data.removalsRequired !== 0) {
      return;
    }

    // Orchestrator already short-circuits B′ before openModal; only build the answers form here.
    this.#buildAnswersForm(this.#resolveSourceIndicesForPrefill());
  }

  protected cancel(): void {
    this.#dialogRef.close();
  }

  protected continueToAnswers(): void {
    if (!this.canContinueRemoval()) {
      this.#removalContinueAttempted.set(true);
      return;
    }

    this.#removalContinueAttempted.set(false);
    const keptSourceIndices = this.#resolveSourceIndicesForPrefill();

    // Build before any skip/compile gate so form validators match silent-compile / Scenario B′.
    if (!this.#hasAnswersFormFor(keptSourceIndices)) {
      this.#buildAnswersForm(keptSourceIndices);
    }

    // A per-order question left to ask always shows the answers step, like the orchestrator's
    // silent compiles: `compileFromGet` would drop it, and the operator must see it.
    const hasPerOrderQuestionsToAsk = this.data.perOrderQuestions.length > 0;

    // Delete-only (e.g. Child 2→1): if GET survivors already answer every FZ question and
    // the prefilled form is valid, close without the answers step — compile from GET.
    if (!hasPerOrderQuestionsToAsk && this.#shouldCompileFromGetAfterRemoval(keptSourceIndices)) {
      this.#dialogRef.close({ compileFromGet: true, keptSourceIndices });
      return;
    }

    if (!hasPerOrderQuestionsToAsk && this.#shouldSkipAnswersStep(keptSourceIndices)) {
      this.#closeWithAnswers(keptSourceIndices);
      return;
    }

    this.#answersConfirmAttempted.set(false);
    this.step.set('answers');
  }

  protected backToRemoval(): void {
    if (!this.showBackButton()) {
      return;
    }

    this.#answersConfirmAttempted.set(false);
    this.step.set('removal');
  }

  protected confirmAnswers(): void {
    const formData = this.formData();
    const formGroup = this.formGroup();
    if (formData === null || formGroup === null) {
      return;
    }

    formGroup.markAllAsTouched();
    formGroup.updateValueAndValidity({ emitEvent: true });
    this.#refreshAnswersSubmittable(formGroup);

    if (!this.canConfirmAnswers()) {
      this.#answersConfirmAttempted.set(true);
      return;
    }

    this.#answersConfirmAttempted.set(false);

    this.#dialogRef.close({
      formData,
      formGroup,
      keptSourceIndices: this.#resolveSourceIndicesForPrefill(),
    });
  }

  protected isRemovalSelected(sourceIndex: number): boolean {
    return this.#selectedRemovalSourceIndices().has(sourceIndex);
  }

  protected canSelectRemoval(sourceIndex: number): boolean {
    if (this.isRemovalSelected(sourceIndex)) {
      return true;
    }

    const row = this.data.removalRows.find(removalRow => removalRow.sourceIndex === sourceIndex);
    if (row === undefined || row.removable !== true) {
      return false;
    }

    const removalsRequiredForType = this.data.removalsBySessionTypeId[row.sessionTypeId] ?? 0;
    const selectedForType = this.#selectedRemovalsBySessionTypeId().get(row.sessionTypeId) ?? 0;

    return selectedForType < removalsRequiredForType;
  }

  protected toggleRemoval(sourceIndex: number, checked: boolean): void {
    const nextSelectedRemovals = new Set(this.#selectedRemovalSourceIndices());

    if (checked) {
      if (!this.canSelectRemoval(sourceIndex)) {
        return;
      }
      nextSelectedRemovals.add(sourceIndex);
    } else {
      nextSelectedRemovals.delete(sourceIndex);
    }

    this.#selectedRemovalSourceIndices.set(nextSelectedRemovals);
  }

  #buildAnswersForm(keptSourceIndices: Array<number | undefined>): void {
    // Target per_ticket questions, plus only the per-order ones the flow must ask. Every other
    // per-order answer stays GET passthrough (orchestrator compile).
    const perTicketQuestions = this.data.questions.filter(question => question.frequency === 'per_ticket');
    const perOrderQuestions = applyPrefillToQuestions(this.data.perOrderQuestions, this.data.answersPerOrder);
    const formData = this.#bookingQuestionsService.getFormData(
      [...perTicketQuestions, ...perOrderQuestions],
      this.data.ticketDetails.length,
      this.data.ticketDetails,
    );

    applyKeptPrefillToFormData(formData, keptSourceIndices, this.data.answersByTicketIndex, this.data.ticketDetails);
    markModificationBookingQuestionsRequired(formData);

    const formGroup = this.#bookingQuestionsService.getFormGroup(formData);
    applyAnswersPrefillToFormGroup(formGroup, formData);

    this.formData.set(formData);
    this.formGroup.set(formGroup);
    this.#builtKeptSourceIndices = keptSourceIndices;
    this.#syncAnswersSubmittable(formGroup);
  }

  #hasAnswersFormFor(keptSourceIndices: Array<number | undefined>): boolean {
    if (this.formGroup() === null || this.#builtKeptSourceIndices === null) {
      return false;
    }

    return this.#areSameKeptSourceIndices(this.#builtKeptSourceIndices, keptSourceIndices);
  }

  #areSameKeptSourceIndices(left: Array<number | undefined>, right: Array<number | undefined>): boolean {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  #refreshAnswersSubmittable(formGroup: UntypedFormGroup): void {
    const formData = this.formData();
    if (formData === null) {
      this.#answersSubmittable.set(false);
      return;
    }

    this.#answersSubmittable.set(formGroup.valid && areModificationBookingQuestionsAnswersComplete(formData, formGroup));
  }

  #syncAnswersSubmittable(formGroup: UntypedFormGroup): void {
    this.#formValiditySubscription?.unsubscribe();
    this.#refreshAnswersSubmittable(formGroup);
    this.#formValiditySubscription = merge(formGroup.statusChanges, formGroup.valueChanges).subscribe(() => {
      this.#refreshAnswersSubmittable(formGroup);
    });
  }

  /**
   * Delete-only after checkbox continue: skip the answers UI when GET survivors already
   * cover every FeverZone per-ticket question (no new slots) AND the prefilled form is
   * valid — same gate as orchestrator silent-compile / `#shouldSkipAnswersStep`. Non-empty
   * GET values can still fail validators; compiling those would surface error 23030118.
   */
  #shouldCompileFromGetAfterRemoval(keptSourceIndices: Array<number | undefined>): boolean {
    const isDeleteOnlyContext = this.data.removalsRequired > 0 || this.data.removalRows.some(row => row.autoRemoved === true);
    if (!isDeleteOnlyContext) {
      return false;
    }

    if (keptSourceIndices.some(sourceIndex => sourceIndex === undefined)) {
      return false;
    }

    const formData = this.formData();
    const formGroup = this.formGroup();
    if (formData === null || formGroup === null || formGroup.valid !== true) {
      return false;
    }

    return (
      areKeptTicketAnswersComplete({
        answersByTicketIndex: this.data.answersByTicketIndex,
        keptSourceIndices,
        questions: this.data.questions,
        ticketDetails: this.data.ticketDetails,
      }) && areModificationBookingQuestionsAnswersComplete(formData, formGroup)
    );
  }

  /**
   * Delete-only shortcut after checkbox continue: skip answers when survivors are already complete,
   * the prefilled form is valid, and nothing was added. Add-only must not skip
   * (no autoRemoved, removalsRequired=0). Completeness alone is not enough — a non-empty value can
   * still fail validators; confirmAnswers() already requires formGroup.valid.
   */
  #shouldSkipAnswersStep(keptSourceIndices: Array<number | undefined>): boolean {
    const isDeleteOnlyContext = this.data.removalsRequired > 0 || this.data.removalRows.some(row => row.autoRemoved === true);
    if (!isDeleteOnlyContext) {
      return false;
    }

    const hasNewSlots = keptSourceIndices.some(sourceIndex => sourceIndex === undefined);
    const formData = this.formData();
    const formGroup = this.formGroup();

    return (
      !hasNewSlots &&
      formData !== null &&
      formGroup !== null &&
      formGroup.valid === true &&
      areModificationBookingQuestionsAnswersComplete(formData, formGroup)
    );
  }

  #closeWithAnswers(keptSourceIndices: Array<number | undefined>): void {
    const formData = this.formData();
    const formGroup = this.formGroup();
    if (formData === null || formGroup === null) {
      return;
    }

    this.#dialogRef.close({
      formData,
      formGroup,
      keptSourceIndices,
    });
  }

  /**
   * One target-aligned list used for prefill and dialog result.
   * Per session type, consume baseline survivors in order; new slots stay `undefined`.
   */
  #resolveSourceIndicesForPrefill(): Array<number | undefined> {
    const selectedRemovals = this.#selectedRemovalSourceIndices();
    const sourceRows = this.data.removalRows.map(row => ({
      autoRemoved: row.autoRemoved === true || (row.removable && selectedRemovals.has(row.sourceIndex)),
      sessionTypeId: row.sessionTypeId,
      sourceIndex: row.sourceIndex,
    }));

    return buildTypeAwareSourceIndices(
      sourceRows,
      this.data.ticketDetails.map(ticketDetail => ticketDetail.sessionType.id),
    );
  }
}
