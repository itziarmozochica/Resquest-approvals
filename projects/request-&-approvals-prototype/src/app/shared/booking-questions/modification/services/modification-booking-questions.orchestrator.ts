import { DestroyRef, inject, Injectable } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { BookingQuestionsService } from '@fz-original/app/shared/booking-questions/booking-questions.service';
import { BookingQuestion, BookingQuestionsFormData, BookingQuestionTicketDetails } from '@fz-original/app/shared/booking-questions/models';
import { CartBookingQuestionAnswerSnapshot } from '@fz-original/app/shared/booking-questions/models/cart-booking-questions-answers.model';
import { BookingQuestionsFormGroupService } from '@fz-original/app/shared/booking-questions/modules/form-group/form-group.service';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { SessionType } from '@fz-original/app/shared/models/session-type/session-type.model';
import { ToastService, type Toast } from '@fz-original/app/shared/services/toast/toast.service';
import { IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { ModificationBookingQuestionsDialogComponent } from '../components/modification-booking-questions-dialog/modification-booking-questions-dialog.component';
import {
  ModificationBookingQuestionsDialogData,
  ModificationBookingQuestionsDialogResult,
} from '../components/modification-booking-questions-dialog/modification-booking-questions-dialog.model';
import { ModificationTicketSlot } from '../models/modification-booking-questions.model';
import {
  alignAnswersByTicketIndexToSlots,
  applyAnswersPrefillToFormGroup,
  applyKeptPrefillToFormData,
  areModificationBookingQuestionsAnswersComplete,
  buildAttendeeRemovalRows,
  buildQuestionIdsBySessionTypeId,
  buildRemovalsBySessionTypeId,
  buildSessionTypeIdByQuestionId,
  buildTypeAwareSourceIndices,
  compileFullFinalBookingQuestionsAnswers,
  countRemovalsNeeded,
  enrichAnswersWithQuestionLabels,
  expandSelectionsToTicketSlots,
  markModificationBookingQuestionsRequired,
  mergeEditedAnswersPerOrder,
  ModificationBookingQuestionAnswer,
  ModificationCompiledBookingQuestionsAnswers,
  ModificationTicketTypeSelection,
  removalChoiceIsInformative,
  selectionsHaveQuantityDelta,
  selectPerOrderQuestionsToCollect,
} from '../utils/modification-booking-questions.util';

/**
 * What to do when the questions catalog has no `per_ticket` question.
 *
 * - `proceed`: carry on with an empty answers form. The backend may still require a full-final
 *   payload whenever the plan has booking questions, so the flow must not decide to omit it here.
 * - `compileOrSkip`: compile straight from the answers GET, or skip when there is nothing at all to
 *   carry over. For flows whose write is a plain cart POST there is nothing to ask and no reason to
 *   show a dialog.
 */
export type ModificationNoPerTicketQuestionsPolicy = 'compileOrSkip' | 'proceed';

export interface ModificationBookingQuestionsRunInput {
  baselineSelections: ModificationTicketTypeSelection[];
  channelId: string;
  currentSelections: ModificationTicketTypeSelection[];
  destroyRef: DestroyRef;
  labelBySessionId: ReadonlyMap<number, string>;
  planId: number;
  /** Cart that owns the current answers group: the answers GET source. */
  sourceCartId: string;
  /** Cart describing the target state; resolves session type and main plan per target slot. */
  targetCart: Cart | null;
  /**
   * Ask the mandatory per-order questions the source answers leave empty, instead of only forwarding
   * the GET. For flows whose write the backend rejects when one is missing (the reschedule cart POST).
   * Defaults to `false`.
   */
  collectMissingPerOrderQuestions?: boolean;
  /**
   * Known upfront by the flow — e.g. a reservation's `plan_has_booking_questions`. `false` skips
   * before any request is made. Leave undefined when only the questions catalog can answer it.
   */
  hasBookingQuestions?: boolean;
  /** Defaults to `proceed`. */
  noPerTicketQuestionsPolicy?: ModificationNoPerTicketQuestionsPolicy;
}

/**
 * Answers collected for one modification attempt, in the two shapes consumers need.
 *
 * - `compiled` is the full-final wire payload (`ticket_index` keyed), for endpoints that take
 *   `booking_questions_answers` in their request body.
 * - `formGroup` / `formData` are the collected form, for writes that POST to the cart answers
 *   endpoint (positional `answers_per_ticket`, and it carries nested choice answers and file
 *   metadata that the compiled shape drops).
 */
export interface ModificationCollectedBookingQuestionsAnswers {
  answersPerOrder: ModificationBookingQuestionAnswer[];
  compiled: ModificationCompiledBookingQuestionsAnswers;
  formData: BookingQuestionsFormData;
  formGroup: UntypedFormGroup;
  /** Lower-cased ids of every target pre-booking question, FeverZone-visible or not. Set when `collectMissingPerOrderQuestions`. */
  targetQuestionIds?: ReadonlySet<string>;
  targetTicketDetails: BookingQuestionTicketDetails[];
  ticketCount: number;
}

export type ModificationBookingQuestionsResult =
  | { kind: 'skip' }
  | { kind: 'cancelled' }
  | { kind: 'error' }
  | { answers: ModificationCollectedBookingQuestionsAnswers; kind: 'ready' };

interface HeadlessAnswersForm {
  complete: boolean;
  formData: BookingQuestionsFormData;
  formGroup: UntypedFormGroup;
}

/**
 * Decides whether the modification booking-questions dialog needs to open, prefills it, and
 * compiles the final answers — for any flow that modifies an existing purchase.
 *
 * Everything flow-specific stays with the consumer: where the selections come from, how the gate is
 * evaluated, and how the result is written. See this folder's `AGENTS.md`.
 */
@Injectable({
  providedIn: 'root',
})
export class ModificationBookingQuestionsOrchestrator {
  readonly #bookingQuestionsFormGroupService = inject(BookingQuestionsFormGroupService);
  readonly #bookingQuestionsService = inject(BookingQuestionsService);
  readonly #igntDialog = inject(IgntDialogService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  run(input: ModificationBookingQuestionsRunInput): Observable<ModificationBookingQuestionsResult> {
    if (input.hasBookingQuestions === false || input.sourceCartId === '') {
      return of<ModificationBookingQuestionsResult>({ kind: 'skip' });
    }

    const baselineSlots = expandSelectionsToTicketSlots(input.baselineSelections, input.labelBySessionId);
    const targetSlots = expandSelectionsToTicketSlots(input.currentSelections, input.labelBySessionId);

    if (targetSlots.length === 0) {
      return of<ModificationBookingQuestionsResult>({ kind: 'skip' });
    }

    const hasQuantityDelta = selectionsHaveQuantityDelta(input.baselineSelections, input.currentSelections);
    const removalsNeeded = countRemovalsNeeded(baselineSlots, targetSlots);
    // Form catalog = target selection only (dropped ticket types e.g. child must not appear).
    // Also load baseline+target whenever alignment needs dropped-type session types: discretionary
    // removals OR a fully dropped type with removalsNeeded === 0. The merged catalog feeds labels +
    // sessionTypeIdByQuestionId only — formQuestions stay target-only.
    const targetQuestionsSelection = buildQuestionsSelection(input.currentSelections, input.planId, input.targetCart, input.channelId);
    const needsDroppedTypeCatalog = removalsNeeded > 0 || hasFullyDroppedTicketTypes(baselineSlots, targetSlots);
    const labelQuestionsSelection = needsDroppedTypeCatalog
      ? buildQuestionsSelection(
          mergeSelectionsForQuestionsCatalog(input.baselineSelections, input.currentSelections),
          input.planId,
          input.targetCart,
          input.channelId,
        )
      : null;

    return forkJoin({
      answers: this.#bookingQuestionsService.getAnswersForCart(input.sourceCartId),
      labelQuestions:
        labelQuestionsSelection !== null
          ? this.#bookingQuestionsService.getQuestionsForSelections(labelQuestionsSelection, 'pre_booking', true)
          : of([]),
      questions: this.#bookingQuestionsService.getQuestionsForSelections(targetQuestionsSelection, 'pre_booking', true),
      targetQuestions:
        input.collectMissingPerOrderQuestions === true
          ? this.#bookingQuestionsService.getQuestionsForSelections(targetQuestionsSelection, 'pre_booking', null)
          : of(null),
    }).pipe(
      catchError((error: unknown): Observable<ModificationBookingQuestionsResult> => {
        console.error('Failed to load booking questions for the modification', error);
        this.#toastService.add({
          autoHide: true,
          message: this.#translateService.instant('errors.generic'),
          sentiment: 'danger' as Toast['sentiment'],
        });
        return of({ kind: 'error' });
      }),
      switchMap((loaded): Observable<ModificationBookingQuestionsResult> => {
        if ('kind' in loaded) {
          return of(loaded);
        }

        const { answers, labelQuestions, questions, targetQuestions } = loaded;
        const targetQuestionIds =
          targetQuestions === null ? undefined : new Set(targetQuestions.map(question => question.id.toLowerCase()));
        const removalsBySessionTypeId = buildRemovalsBySessionTypeId(baselineSlots, targetSlots);
        const rawAnswersByTicketIndex = convertCartAnswersByTicketIndex(answers.answersByTicketIndex);
        const catalogQuestions = [...questions, ...labelQuestions];
        // Omit ambiguous question ids (same id under multiple session_type_ids) — see buildSessionTypeIdByQuestionId.
        const sessionTypeIdByQuestionId = buildSessionTypeIdByQuestionId(catalogQuestions);
        const questionIdsBySessionTypeId = buildQuestionIdsBySessionTypeId(catalogQuestions);
        const alignedAnswersByTicketIndex = alignAnswersByTicketIndexToSlots(
          baselineSlots,
          rawAnswersByTicketIndex,
          sessionTypeIdByQuestionId,
          questionIdsBySessionTypeId,
        );
        const answersPerOrder: ModificationBookingQuestionAnswer[] = answers.answersPerOrder.map(snapshot => ({
          questionId: snapshot.questionId,
          questionLabel: snapshot.questionLabel,
          sessionTypeId: snapshot.sessionTypeId ?? sessionTypeIdByQuestionId.get(snapshot.questionId),
          values: snapshot.values,
        }));
        const questionLabelById = buildQuestionLabelById(catalogQuestions, alignedAnswersByTicketIndex, answersPerOrder);
        const answersByTicketIndex = enrichAnswersWithQuestionLabels(alignedAnswersByTicketIndex, questionLabelById);
        const ticketDetails = buildTicketDetails(targetSlots, input.targetCart, input.planId);
        // per_order is GET passthrough, except the mandatory ones a collecting flow finds unanswered.
        const formQuestions = questions.filter(question => question.frequency === 'per_ticket');
        const perOrderQuestions =
          input.collectMissingPerOrderQuestions === true ? selectPerOrderQuestionsToCollect(questions, answersPerOrder) : [];
        const hasPerOrderQuestionsToAsk = perOrderQuestions.length > 0;
        const sessionTypeIdByTargetIndex = new Map(
          targetSlots.map((slot, index) => [index + 1, ticketDetails[index]?.sessionType.id ?? slot.sessionTypeId]),
        );
        // Writes replace the whole answers group, so the payload must retain question ids that are
        // not visible in FeverZone but came back from the answers GET — not only catalog ids.
        const allowedQuestionIds = new Set([
          ...formQuestions.map(question => question.id),
          ...perOrderQuestions.map(question => question.id),
          ...answersPerOrder.map(answer => answer.questionId),
          ...Object.values(rawAnswersByTicketIndex).flatMap(ticketAnswers => ticketAnswers.map(answer => answer.questionId)),
        ]);

        const compileReady = (
          keptSourceIndices: Array<number | undefined>,
          editedAnswersByTargetIndex: Record<number, ModificationBookingQuestionAnswer[]> = {},
          collectedForm?: Pick<HeadlessAnswersForm, 'formData' | 'formGroup'>,
          editedAnswersPerOrder: ModificationBookingQuestionAnswer[] = [],
        ): ModificationBookingQuestionsResult => {
          const form =
            collectedForm ?? this.#buildHeadlessAnswersForm(formQuestions, ticketDetails, keptSourceIndices, answersByTicketIndex);

          return {
            answers: {
              answersPerOrder,
              compiled: compileFullFinalBookingQuestionsAnswers({
                allowedQuestionIds,
                answersByTicketIndex,
                answersPerOrder: mergeEditedAnswersPerOrder(answersPerOrder, editedAnswersPerOrder),
                editedAnswersByTargetIndex,
                keptSourceIndices,
                sessionTypeIdByQuestionId,
                sessionTypeIdByTargetIndex,
                targetCount: targetSlots.length,
              }),
              formData: form.formData,
              formGroup: form.formGroup,
              ...(targetQuestionIds !== undefined && { targetQuestionIds }),
              targetTicketDetails: ticketDetails,
              ticketCount: targetSlots.length,
            },
            kind: 'ready',
          };
        };

        // Nothing to ask. Consumers whose backend still expects a full-final payload proceed as
        // usual; the rest compile from the GET, or skip when there is nothing to carry over at all.
        if (formQuestions.length === 0 && !hasPerOrderQuestionsToAsk && input.noPerTicketQuestionsPolicy === 'compileOrSkip') {
          if (answersPerOrder.length === 0 && Object.keys(rawAnswersByTicketIndex).length === 0) {
            return of<ModificationBookingQuestionsResult>({ kind: 'skip' });
          }

          return of(
            compileReady(
              buildTypeAwareSourceIndices(
                baselineSlots.map(slot => ({ sessionTypeId: slot.sessionTypeId, sourceIndex: slot.sourceIndex })),
                ticketDetails.map(ticketDetail => ticketDetail.sessionType.id),
              ),
            ),
          );
        }

        if (formQuestions.length === 0 && !hasPerOrderQuestionsToAsk && removalsNeeded === 0) {
          return of(
            compileReady(
              buildTypeAwareSourceIndices(
                baselineSlots.map(slot => ({ sessionTypeId: slot.sessionTypeId, sourceIndex: slot.sourceIndex })),
                ticketDetails.map(ticketDetail => ticketDetail.sessionType.id),
              ),
            ),
          );
        }

        const removalRows = buildAttendeeRemovalRows(
          baselineSlots,
          answersByTicketIndex,
          targetSlots,
          (sourceIndex: number): string =>
            this.#translateService.instant('bookingQuestions.modificationDialog.ticketFallback', { index: sourceIndex }),
          questionLabelById,
          sessionTypeIdByQuestionId,
          questionIdsBySessionTypeId,
        );

        // The silent compiles below only judge per-ticket answers, so a per-order question left to ask
        // always opens the dialog.
        // Fully dropped type(s) only (e.g. remove Adult, keep Kid): no checkboxes, and if survivors
        // already have complete answers → skip the dialog entirely.
        const autoOnlyKeptSourceIndices = hasPerOrderQuestionsToAsk
          ? null
          : this.#tryResolveAutoOnlyCompleteKeptSourceIndices({
              answersByTicketIndex,
              formQuestions,
              removalRows,
              removalsNeeded,
              ticketDetails,
            });
        if (autoOnlyKeptSourceIndices !== null) {
          return of(compileReady(autoOnlyKeptSourceIndices));
        }

        // Candidates that carry the same answer lines are interchangeable, so the picker cannot
        // change the payload. Resolve it instead of asking; incomplete answers still fall through
        // to the dialog for the gap-fill.
        if (!hasPerOrderQuestionsToAsk && removalsNeeded > 0 && !removalChoiceIsInformative(removalRows, answersByTicketIndex)) {
          const interchangeableKeptSourceIndices = this.#resolveCompleteKeptSourceIndicesFromRemovalRows({
            answersByTicketIndex,
            formQuestions,
            removalRows,
            ticketDetails,
          });
          if (interchangeableKeptSourceIndices !== null) {
            return of(compileReady(interchangeableKeptSourceIndices));
          }
        }

        // Same ticket-type counts (including a pure date change): the payload must still be
        // full-final. Silent-compile from the GET when complete; otherwise open the answers-only
        // gap-fill with no removal step.
        if (!hasPerOrderQuestionsToAsk && !hasQuantityDelta) {
          const sameCountKeptSourceIndices = this.#tryResolveSameCountCompleteKeptSourceIndices({
            answersByTicketIndex,
            baselineSlots,
            formQuestions,
            ticketDetails,
          });
          if (sameCountKeptSourceIndices !== null) {
            return of(compileReady(sameCountKeptSourceIndices));
          }
        }

        const dialogRef = this.#igntDialog.openModal<
          ModificationBookingQuestionsDialogResult,
          ModificationBookingQuestionsDialogData,
          ModificationBookingQuestionsDialogComponent
        >(ModificationBookingQuestionsDialogComponent, {
          data: {
            answersByTicketIndex,
            answersPerOrder,
            perOrderQuestions,
            questions: formQuestions,
            removalRows,
            removalsBySessionTypeId,
            removalsRequired: removalsNeeded,
            ticketDetails,
          },
          disableCloseShortcuts: true,
          size: 'md',
        });
        // Only close on navigate-away if the dialog never emitted closed$. Calling close()
        // after a normal confirm/cancel double-disposes the CDK overlay and can blank the next route.
        let isDialogOpen = true;
        input.destroyRef.onDestroy(() => {
          if (isDialogOpen) {
            dialogRef.close();
          }
        });

        return dialogRef.closed$.pipe(
          tap(() => {
            isDialogOpen = false;
          }),
          map((result): ModificationBookingQuestionsResult => {
            if (result === undefined) {
              return { kind: 'cancelled' };
            }

            if ('compileFromGet' in result) {
              return compileReady(result.keptSourceIndices);
            }

            if (result.formGroup.valid !== true || !areModificationBookingQuestionsAnswersComplete(result.formData, result.formGroup)) {
              return { kind: 'cancelled' };
            }

            const mappedAnswers = this.#bookingQuestionsFormGroupService.mapToAnswers(result.formGroup, result.formData);
            const editedAnswersByTargetIndex = buildEditedAnswersByTargetIndex(
              mappedAnswers,
              result.formData.ticketDetails ?? [],
              ticketDetails,
            );

            return compileReady(
              result.keptSourceIndices,
              editedAnswersByTargetIndex,
              {
                formData: result.formData,
                formGroup: result.formGroup,
              },
              buildEditedAnswersPerOrder(mappedAnswers),
            );
          }),
        );
      }),
    );
  }

  /**
   * The same prefilled form the dialog would build, without rendering it. Used both as the
   * silent-compile completeness gate and as the payload source for cart writes.
   */
  #buildHeadlessAnswersForm(
    formQuestions: BookingQuestion[],
    ticketDetails: BookingQuestionTicketDetails[],
    keptSourceIndices: Array<number | undefined>,
    answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>,
  ): HeadlessAnswersForm {
    const formData = this.#bookingQuestionsService.getFormData(formQuestions, ticketDetails.length, ticketDetails);
    formData.perOrder = [];
    applyKeptPrefillToFormData(formData, keptSourceIndices, answersByTicketIndex, ticketDetails);
    markModificationBookingQuestionsRequired(formData);

    const formGroup = this.#bookingQuestionsService.getFormGroup(formData);
    applyAnswersPrefillToFormGroup(formGroup, formData);

    return {
      complete: formGroup.valid === true && areModificationBookingQuestionsAnswersComplete(formData, formGroup),
      formData,
      formGroup,
    };
  }

  /**
   * Silent-compile gate: when there are questions to answer, every target slot must map to a
   * survivor AND the prefilled form must be valid. Completeness alone is not enough — a non-empty
   * value can still fail a validator (same rule as the dialog's delete-only shortcut). With no
   * questions there is nothing to prefill or validate, so an added slot with no survivor is
   * complete by construction.
   */
  #keptSourceIndicesAreComplete(
    args: {
      answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>;
      formQuestions: BookingQuestion[];
      ticketDetails: BookingQuestionTicketDetails[];
    },
    keptSourceIndices: Array<number | undefined>,
  ): boolean {
    if (args.formQuestions.length === 0) {
      return true;
    }

    if (keptSourceIndices.some(sourceIndex => sourceIndex === undefined)) {
      return false;
    }

    return this.#buildHeadlessAnswersForm(args.formQuestions, args.ticketDetails, keptSourceIndices, args.answersByTicketIndex).complete;
  }

  /**
   * Keep the earliest surviving slot of each ticket type, and return it only when the resulting
   * prefill is complete. Shared by the auto-removed and the indistinguishable-candidate paths,
   * which differ only in the precondition their callers check.
   */
  #resolveCompleteKeptSourceIndicesFromRemovalRows(args: {
    answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>;
    formQuestions: BookingQuestion[];
    removalRows: ReturnType<typeof buildAttendeeRemovalRows>;
    ticketDetails: BookingQuestionTicketDetails[];
  }): Array<number | undefined> | null {
    const keptSourceIndices = buildTypeAwareSourceIndices(
      args.removalRows,
      args.ticketDetails.map(ticketDetail => ticketDetail.sessionType.id),
    );

    return this.#keptSourceIndicesAreComplete(args, keptSourceIndices) ? keptSourceIndices : null;
  }

  /**
   * When the only quantity change is fully dropping ticket type(s) (auto-removed) and every
   * surviving ticket already has complete answers, return kept source indices so the dialog can be
   * skipped. Otherwise null.
   */
  #tryResolveAutoOnlyCompleteKeptSourceIndices(args: {
    answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>;
    formQuestions: BookingQuestion[];
    removalRows: ReturnType<typeof buildAttendeeRemovalRows>;
    removalsNeeded: number;
    ticketDetails: BookingQuestionTicketDetails[];
  }): Array<number | undefined> | null {
    if (args.removalsNeeded !== 0 || !args.removalRows.some(row => row.autoRemoved === true)) {
      return null;
    }

    return this.#resolveCompleteKeptSourceIndicesFromRemovalRows(args);
  }

  /**
   * Same ticket-type quantities (including a pure date change): map each target slot to the next
   * baseline survivor of that type and silent-compile when answers are already complete.
   */
  #tryResolveSameCountCompleteKeptSourceIndices(args: {
    answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>;
    baselineSlots: ModificationTicketSlot[];
    formQuestions: BookingQuestion[];
    ticketDetails: BookingQuestionTicketDetails[];
  }): Array<number | undefined> | null {
    const keptSourceIndices = buildTypeAwareSourceIndices(
      args.baselineSlots.map(slot => ({ sessionTypeId: slot.sessionTypeId, sourceIndex: slot.sourceIndex })),
      args.ticketDetails.map(ticketDetail => ticketDetail.sessionType.id),
    );

    return this.#keptSourceIndicesAreComplete(args, keptSourceIndices) ? keptSourceIndices : null;
  }
}

function buildQuestionsSelection(
  selections: ModificationTicketTypeSelection[],
  planId: number,
  cart: Cart | null,
  channelId: string,
): { channelId: string; mainPlanIds: number[]; sessionIds: number[] } {
  const sessionIds = [...new Set(selections.filter(selection => selection.quantity > 0).map(selection => selection.sessionId))];
  const planIdsFromCart = [
    ...new Set(
      [...(cart?.sessionItemsByDatetime.values() ?? [])]
        .flat()
        .map(session => session.mainPlanId)
        .filter((mainPlanId): mainPlanId is number => mainPlanId !== undefined && mainPlanId !== null),
    ),
  ];
  const mainPlanIds = planIdsFromCart.length > 0 ? planIdsFromCart : [planId];

  return { channelId, mainPlanIds, sessionIds };
}

/** True when any baseline session type has zero tickets in the target (auto-removed). */
function hasFullyDroppedTicketTypes(baselineSlots: ModificationTicketSlot[], targetSlots: ModificationTicketSlot[]): boolean {
  const targetSessionTypeIds = new Set(targetSlots.map(slot => slot.sessionTypeId));
  return baselineSlots.some(slot => !targetSessionTypeIds.has(slot.sessionTypeId));
}

function mergeSelectionsForQuestionsCatalog(
  baselineSelections: ModificationTicketTypeSelection[],
  currentSelections: ModificationTicketTypeSelection[],
): ModificationTicketTypeSelection[] {
  const bySessionId = new Map<number, ModificationTicketTypeSelection>();

  for (const selection of [...baselineSelections, ...currentSelections]) {
    if (selection.quantity <= 0) {
      continue;
    }

    const existing = bySessionId.get(selection.sessionId);
    if (existing === undefined || selection.quantity > existing.quantity) {
      bySessionId.set(selection.sessionId, selection);
    }
  }

  return [...bySessionId.values()];
}

function buildQuestionLabelById(
  questions: BookingQuestion[],
  answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>,
  answersPerOrder: ModificationBookingQuestionAnswer[],
): Map<string, string> {
  const questionLabelById = new Map<string, string>();

  for (const question of questions) {
    if (question.label.length > 0) {
      questionLabelById.set(question.id, question.label);
    }
  }

  for (const answer of [...answersPerOrder, ...Object.values(answersByTicketIndex).flat()]) {
    if (answer.questionLabel !== undefined && answer.questionLabel.length > 0 && !questionLabelById.has(answer.questionId)) {
      questionLabelById.set(answer.questionId, answer.questionLabel);
    }
  }

  return questionLabelById;
}

function buildEditedAnswersByTargetIndex(
  mappedAnswers: ReturnType<BookingQuestionsFormGroupService['mapToAnswers']>,
  formTicketDetails: BookingQuestionTicketDetails[],
  targetTicketDetails: BookingQuestionTicketDetails[],
): Record<number, ModificationBookingQuestionAnswer[]> {
  const editedAnswersByTargetIndex: Record<number, ModificationBookingQuestionAnswer[]> = {};

  mappedAnswers.perTicket.forEach((items, compactedIndex) => {
    const formTicketDetail = formTicketDetails[compactedIndex];
    const physicalIndex = formTicketDetail !== undefined ? targetTicketDetails.indexOf(formTicketDetail) : compactedIndex;
    const targetIndex = physicalIndex >= 0 ? physicalIndex + 1 : compactedIndex + 1;
    const ticketSessionTypeId = formTicketDetail?.sessionType.id ?? targetTicketDetails[physicalIndex]?.sessionType.id;

    editedAnswersByTargetIndex[targetIndex] = items.map(item => ({
      questionId: item.question.id,
      // Every answer in a ticket bucket must carry that ticket's session_type_id: the
      // question-scoped id when set, otherwise the ticket session type.
      sessionTypeId: item.question.sessionTypeId ?? ticketSessionTypeId,
      values: answerValueToStringArray(item.answer.value),
    }));
  });

  return editedAnswersByTargetIndex;
}

function buildEditedAnswersPerOrder(
  mappedAnswers: ReturnType<BookingQuestionsFormGroupService['mapToAnswers']>,
): ModificationBookingQuestionAnswer[] {
  return mappedAnswers.perOrder
    .filter(item => item.answer.value !== null)
    .map(item => ({
      questionId: item.question.id,
      sessionTypeId: item.question.sessionTypeId,
      values: answerValueToStringArray(item.answer.value),
    }));
}

function buildTicketDetails(targetSlots: ModificationTicketSlot[], cart: Cart | null, mainPlanId: number): BookingQuestionTicketDetails[] {
  const sessionById = new Map(
    [...(cart?.sessionItemsByDatetime.values() ?? [])].flat().map(session => [session.sessionId, session] as const),
  );

  return targetSlots.map(slot => {
    const cartSession = sessionById.get(slot.sessionId);

    return {
      label: slot.label || cartSession?.sessionName || '',
      mainPlanId: cartSession?.mainPlanId ?? mainPlanId,
      sessionType: cartSession?.sessionType ?? new SessionType(slot.sessionTypeId, slot.label),
    };
  });
}

function answerValueToStringArray(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(entry => String(entry));
  }

  return [String(value)];
}

function convertCartAnswersByTicketIndex(
  answersByTicketIndex: Record<number, CartBookingQuestionAnswerSnapshot[]>,
): Record<number, ModificationBookingQuestionAnswer[]> {
  return Object.fromEntries(
    Object.entries(answersByTicketIndex).map(([ticketIndex, snapshots]) => [
      Number(ticketIndex),
      snapshots.map(snapshot => ({
        questionId: snapshot.questionId,
        questionLabel: snapshot.questionLabel,
        ...(snapshot.sessionTypeId !== undefined ? { sessionTypeId: snapshot.sessionTypeId } : {}),
        values: snapshot.values,
      })),
    ]),
  );
}
