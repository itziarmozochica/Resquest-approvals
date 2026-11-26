import { BookingQuestion, BookingQuestionsFormData } from '@fz-original/app/shared/booking-questions/models';
import { BookingQuestionInteractionMode } from '@fz-original/app/shared/booking-questions/models/booking-question-interaction-mode';
import { BookingQuestionTicketDetails } from '@fz-original/app/shared/booking-questions/models/booking-question-ticket-details';
import { InteractionConfiguration } from '@fz-original/app/shared/booking-questions/models/interaction-configuration';
import { mergeBookingQuestionsPrioritizingMandatory } from '@fz-original/app/shared/booking-questions/utils/merge-booking-questions.util';
import { getBookingQuestionControlId } from '@fz-original/app/shared/utils/booking-questions.utils';

import { ModificationAttendeeRemovalRow, ModificationTicketSlot } from '../models/modification-booking-questions.model';

export interface ModificationSessionQuantitySelection {
  sessionId: number;
  sessionTypeId: number;
  quantity: number;
}

export interface ModificationTicketTypeSelection {
  sessionId: number;
  sessionTypeId: number;
  quantity: number;
}

export interface ModificationBookingQuestionAnswer {
  questionId: string;
  questionLabel?: string;
  sessionTypeId?: number;
  values: string[];
}

export interface ModificationCompiledBookingQuestionAnswer {
  question_id: string;
  values: string[];
  session_type_id?: number;
}

export interface ModificationCompiledBookingQuestionsAnswers {
  answers_per_order: ModificationCompiledBookingQuestionAnswer[];
  answers_per_ticket: { ticket_index: number; answers: ModificationCompiledBookingQuestionAnswer[] }[];
}

/**
 * True when per-session-*type* ticket counts differ.
 * Pure reschedule (same type quantities, new session ids) is not a quantity delta.
 */
export function selectionsHaveQuantityDelta(
  baseline: ReadonlyArray<{ sessionTypeId: number; quantity: number }>,
  current: ReadonlyArray<{ sessionTypeId: number; quantity: number }>,
): boolean {
  const baselineBySessionTypeId = buildQuantityBySessionTypeId(baseline);
  const currentBySessionTypeId = buildQuantityBySessionTypeId(current);
  const sessionTypeIds = new Set([...baselineBySessionTypeId.keys(), ...currentBySessionTypeId.keys()]);

  for (const sessionTypeId of sessionTypeIds) {
    if ((baselineBySessionTypeId.get(sessionTypeId) ?? 0) !== (currentBySessionTypeId.get(sessionTypeId) ?? 0)) {
      return true;
    }
  }

  return false;
}

export function shouldOpenModificationBookingQuestionsModal(
  planHasBookingQuestions: boolean,
  baseline: ReadonlyArray<{ sessionTypeId: number; quantity: number }>,
  current: ReadonlyArray<{ sessionTypeId: number; quantity: number }>,
): boolean {
  return planHasBookingQuestions && selectionsHaveQuantityDelta(baseline, current);
}

export function expandSelectionsToTicketSlots(
  selections: ModificationTicketTypeSelection[],
  labelBySessionId: ReadonlyMap<number, string>,
): ModificationTicketSlot[] {
  const slots: ModificationTicketSlot[] = [];
  let sourceIndex = 1;

  for (const selection of selections) {
    if (selection.quantity <= 0) {
      continue;
    }

    const label = labelBySessionId.get(selection.sessionId) ?? '';

    for (let slot = 0; slot < selection.quantity; slot += 1) {
      slots.push({
        label,
        sessionId: selection.sessionId,
        sessionTypeId: selection.sessionTypeId,
        sourceIndex,
      });
      sourceIndex += 1;
    }
  }

  return slots;
}

/**
 * Discretionary removals across surviving ticket types (same keying as dialog quotas).
 * Fully dropped types are excluded — they are auto-removed.
 * Session rebalance within a type (qty moves between sessions, type total unchanged) → 0.
 */
export function countRemovalsNeeded(baselineSlots: ModificationTicketSlot[], targetSlots: ModificationTicketSlot[]): number {
  return Object.values(buildRemovalsBySessionTypeId(baselineSlots, targetSlots)).reduce(
    (removalsNeeded, removalsForType) => removalsNeeded + removalsForType,
    0,
  );
}

export function buildRemovalsBySessionTypeId(
  baselineSlots: ModificationTicketSlot[],
  targetSlots: ModificationTicketSlot[],
): Record<number, number> {
  const baselineCountBySessionTypeId = countSlotsBySessionTypeId(baselineSlots);
  const targetCountBySessionTypeId = countSlotsBySessionTypeId(targetSlots);
  const sessionTypeIds = new Set([...baselineCountBySessionTypeId.keys(), ...targetCountBySessionTypeId.keys()]);
  const removalsBySessionTypeId: Record<number, number> = {};

  for (const sessionTypeId of sessionTypeIds) {
    const baselineCount = baselineCountBySessionTypeId.get(sessionTypeId) ?? 0;
    const targetCount = targetCountBySessionTypeId.get(sessionTypeId) ?? 0;
    if (targetCount === 0) {
      continue;
    }

    const removals = Math.max(0, baselineCount - targetCount);
    if (removals > 0) {
      removalsBySessionTypeId[sessionTypeId] = removals;
    }
  }

  return removalsBySessionTypeId;
}

export function countSelectedRemovalsBySessionTypeId(
  removalRows: ModificationAttendeeRemovalRow[],
  selectedRemovalSourceIndices: ReadonlySet<number>,
): Map<number, number> {
  const selectedBySessionTypeId = new Map<number, number>();

  for (const row of removalRows) {
    if (row.removable !== true || !selectedRemovalSourceIndices.has(row.sourceIndex)) {
      continue;
    }

    selectedBySessionTypeId.set(row.sessionTypeId, (selectedBySessionTypeId.get(row.sessionTypeId) ?? 0) + 1);
  }

  return selectedBySessionTypeId;
}

export function areRemovalSelectionsComplete(
  removalsBySessionTypeId: Readonly<Record<number, number>>,
  selectedBySessionTypeId: ReadonlyMap<number, number>,
  removalsRequired: number,
): boolean {
  let selectedTotal = 0;

  for (const [sessionTypeIdKey, requiredRemovals] of Object.entries(removalsBySessionTypeId)) {
    const sessionTypeId = Number(sessionTypeIdKey);
    const selectedRemovals = selectedBySessionTypeId.get(sessionTypeId) ?? 0;

    if (selectedRemovals !== requiredRemovals) {
      return false;
    }

    selectedTotal += selectedRemovals;
  }

  return selectedTotal === removalsRequired;
}

/**
 * Re-keys cart GET `answers_by_ticket_index` onto baseline slot `sourceIndex` values by
 * session type. Stored ticket indices follow create-time order (e.g. Adult, Adult, Child,
 * Child) while FRM slots expand selections (e.g. all Adults then all Children) — a raw
 * index join paints child answers on adult rows and leaves kids blank.
 *
 * Within each session type, answer buckets are sorted by original ticket_index and zipped
 * onto that type's slots in expand order. Orchestrator (BDE-5188) should reuse this map for
 * prefill/compile, not only removal labels.
 */
export function alignAnswersByTicketIndexToSlots(
  slots: ReadonlyArray<ModificationTicketSlot>,
  answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>,
  sessionTypeIdByQuestionId: ReadonlyMap<string, number | undefined> = new Map(),
  questionIdsBySessionTypeId: ReadonlyMap<number, ReadonlySet<string>> = new Map(),
): Record<number, ModificationBookingQuestionAnswer[]> {
  // Same as prefill/compile: normalize catalog keys so answer questionIds match case-insensitively.
  const sessionTypeIdLookup = toLowerCaseKeyedMap(sessionTypeIdByQuestionId);
  const questionIdsByType = normalizeQuestionIdsBySessionTypeId(questionIdsBySessionTypeId);

  if (!canAlignAnswersBySessionType(answersByTicketIndex, sessionTypeIdLookup, questionIdsByType)) {
    return answersByTicketIndex;
  }

  const bucketsBySessionTypeId = new Map<number, Array<{ ticketIndex: number; answers: ModificationBookingQuestionAnswer[] }>>();
  const unclassifiedByTicketIndex = new Map<number, ModificationBookingQuestionAnswer[]>();
  const slotSessionTypeIds = new Set(slots.map(slot => slot.sessionTypeId));

  for (const [ticketIndexKey, answers] of Object.entries(answersByTicketIndex)) {
    const ticketIndex = Number(ticketIndexKey);
    const sessionTypeId = classifyAnswersSessionTypeId(answers, sessionTypeIdLookup, questionIdsByType, slotSessionTypeIds);
    if (sessionTypeId === undefined) {
      unclassifiedByTicketIndex.set(ticketIndex, answers);
      continue;
    }

    const buckets = bucketsBySessionTypeId.get(sessionTypeId) ?? [];
    buckets.push({ answers, ticketIndex });
    bucketsBySessionTypeId.set(sessionTypeId, buckets);
  }

  for (const buckets of bucketsBySessionTypeId.values()) {
    buckets.sort((left, right) => left.ticketIndex - right.ticketIndex);
  }

  const aligned: Record<number, ModificationBookingQuestionAnswer[]> = {};
  const slotsBySessionTypeId = groupSlotsBySessionTypeId(slots);

  for (const [sessionTypeId, typeSlots] of slotsBySessionTypeId) {
    const buckets = bucketsBySessionTypeId.get(sessionTypeId) ?? [];

    typeSlots.forEach((slot, typeSlotIndex) => {
      const bucket = buckets[typeSlotIndex];
      // Keep every answer on the ticket bucket — filtering by resolved session type hid
      // identifying Q&A lines (and starved prefill) when catalog metadata was incomplete.
      aligned[slot.sourceIndex] = bucket === undefined ? (unclassifiedByTicketIndex.get(slot.sourceIndex) ?? []) : bucket.answers;
    });
  }

  return aligned;
}

/**
 * Per-ticket question ids (lowercased) for each session type, including unscoped questions
 * on every type. Used to classify GET answer buckets when question ids are shared across
 * types and answers omit `sessionTypeId`.
 */
export function buildQuestionIdsBySessionTypeId(
  questions: ReadonlyArray<{ id: string; frequency?: string; sessionTypeId?: number }>,
): Map<number, Set<string>> {
  const questionIdsBySessionTypeId = new Map<number, Set<string>>();
  const unscopedQuestionIds = new Set<string>();

  for (const question of questions) {
    if (question.frequency === 'per_order') {
      continue;
    }

    const questionIdLower = question.id.toLowerCase();
    if (question.sessionTypeId === undefined || question.sessionTypeId === null) {
      unscopedQuestionIds.add(questionIdLower);
      continue;
    }

    const questionIds = questionIdsBySessionTypeId.get(question.sessionTypeId) ?? new Set<string>();
    questionIds.add(questionIdLower);
    questionIdsBySessionTypeId.set(question.sessionTypeId, questionIds);
  }

  for (const questionIds of questionIdsBySessionTypeId.values()) {
    for (const questionIdLower of unscopedQuestionIds) {
      questionIds.add(questionIdLower);
    }
  }

  return questionIdsBySessionTypeId;
}

/** Stamp catalog labels onto GET answers so removal rows show `Label: value` even when BE omits question_label. */
export function enrichAnswersWithQuestionLabels(
  answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>,
  questionLabelById: ReadonlyMap<string, string>,
): Record<number, ModificationBookingQuestionAnswer[]> {
  const labelLookup = buildCaseInsensitiveLabelLookup(questionLabelById);

  return Object.fromEntries(
    Object.entries(answersByTicketIndex).map(([ticketIndexKey, answers]) => [
      Number(ticketIndexKey),
      answers.map(answer => {
        const questionLabel =
          (answer.questionLabel !== undefined && answer.questionLabel.length > 0 ? answer.questionLabel : undefined) ??
          labelLookup.get(answer.questionId) ??
          labelLookup.get(answer.questionId.toLowerCase());

        return questionLabel !== undefined && questionLabel.length > 0 ? { ...answer, questionLabel } : { ...answer };
      }),
    ]),
  );
}

/**
 * Catalog may repeat the same question_id under different session_type_ids
 * (MainPlanQuestion unique on question + plan + session_type). Only unambiguous
 * question ids are stored — ambiguous ids are omitted so alignment does not
 * last-write-wins wipe a type. Shared ids still align when GET answers carry
 * `sessionTypeId` (see `alignAnswersByTicketIndexToSlots` / cart adapter).
 */
export function buildSessionTypeIdByQuestionId(
  questions: ReadonlyArray<{ id: string; sessionTypeId?: number }>,
): Map<string, number | undefined> {
  const map = new Map<string, number | undefined>();
  const ambiguousQuestionIds = new Set<string>();

  for (const question of questions) {
    if (ambiguousQuestionIds.has(question.id)) {
      continue;
    }

    if (!map.has(question.id)) {
      map.set(question.id, question.sessionTypeId);
      continue;
    }

    if (map.get(question.id) !== question.sessionTypeId) {
      map.delete(question.id);
      ambiguousQuestionIds.add(question.id);
    }
  }

  return map;
}

export function buildAttendeeRemovalRows(
  baselineSlots: ModificationTicketSlot[],
  answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>,
  targetSlots: ModificationTicketSlot[],
  formatFallbackTicketLabel: (sourceIndex: number) => string,
  questionLabelById: ReadonlyMap<string, string> = new Map(),
  sessionTypeIdByQuestionId: ReadonlyMap<string, number | undefined> = new Map(),
  questionIdsBySessionTypeId: ReadonlyMap<number, ReadonlySet<string>> = new Map(),
): ModificationAttendeeRemovalRow[] {
  const labelLookup = buildCaseInsensitiveLabelLookup(questionLabelById);
  const baselineCountBySessionTypeId = countSlotsBySessionTypeId(baselineSlots);
  const targetCountBySessionTypeId = countSlotsBySessionTypeId(targetSlots);
  const removalsBySessionTypeId = buildRemovalsBySessionTypeId(baselineSlots, targetSlots);
  const answersAlignedToSlots = alignAnswersByTicketIndexToSlots(
    baselineSlots,
    answersByTicketIndex,
    sessionTypeIdByQuestionId,
    questionIdsBySessionTypeId,
  );

  return baselineSlots.map(slot => {
    const baselineCount = baselineCountBySessionTypeId.get(slot.sessionTypeId) ?? 0;
    const targetCount = targetCountBySessionTypeId.get(slot.sessionTypeId) ?? 0;
    const autoRemoved = baselineCount > 0 && targetCount === 0;
    const removals = removalsBySessionTypeId[slot.sessionTypeId] ?? 0;

    return {
      answerLines: buildAttendeeAnswerLines(answersAlignedToSlots[slot.sourceIndex], labelLookup),
      autoRemoved,
      label: slot.label.length > 0 ? slot.label : formatFallbackTicketLabel(slot.sourceIndex),
      removable: !autoRemoved && removals > 0,
      sessionTypeId: slot.sessionTypeId,
      sourceIndex: slot.sourceIndex,
    };
  });
}

/**
 * True when the partner's removal choice can change the compiled payload. Candidates are compared
 * on the identity of their answers — question id plus values — and not only on the rendered answer
 * lines, which collide when two different questions resolve no label and render a bare value.
 * Buckets by session type: two types that are each internally uniform must not read as informative
 * merely because they differ from one another.
 */
export function removalChoiceIsInformative(
  removalRows: readonly ModificationAttendeeRemovalRow[],
  answersBySourceIndex: Record<number, ModificationBookingQuestionAnswer[]> = {},
): boolean {
  const fingerprintsBySessionTypeId = new Map<number, Set<string>>();

  for (const row of removalRows) {
    if (row.autoRemoved === true || !row.removable) {
      continue;
    }

    const fingerprints = fingerprintsBySessionTypeId.get(row.sessionTypeId) ?? new Set<string>();
    fingerprints.add(buildRemovalRowFingerprint(row, answersBySourceIndex[row.sourceIndex] ?? []));
    fingerprintsBySessionTypeId.set(row.sessionTypeId, fingerprints);
  }

  return [...fingerprintsBySessionTypeId.values()].some(fingerprints => fingerprints.size > 1);
}

function buildRemovalRowFingerprint(row: ModificationAttendeeRemovalRow, answers: readonly ModificationBookingQuestionAnswer[]): string {
  const answerIdentities = answers.map(answer => JSON.stringify([answer.questionId, answer.values])).sort();

  return JSON.stringify([answerIdentities, row.answerLines]);
}

function canAlignAnswersBySessionType(
  answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>,
  sessionTypeIdByQuestionId: ReadonlyMap<string, number | undefined>,
  questionIdsBySessionTypeId: ReadonlyMap<number, ReadonlySet<string>>,
): boolean {
  if (questionIdsBySessionTypeId.size > 0) {
    return true;
  }

  // A map of questionId → undefined (unscoped catalog) must not enable alignment:
  // every bucket would classify as unclassified and wipe answers if we assigned [].
  const hasDefinedCatalogSessionType = [...sessionTypeIdByQuestionId.values()].some(
    sessionTypeId => sessionTypeId !== undefined && sessionTypeId !== null,
  );
  if (hasDefinedCatalogSessionType) {
    return true;
  }

  return Object.values(answersByTicketIndex).some(answers =>
    answers.some(answer => answer.sessionTypeId !== undefined && answer.sessionTypeId !== null),
  );
}

function toLowerCaseKeyedMap<T>(map: ReadonlyMap<string, T>): Map<string, T> {
  return new Map([...map.entries()].map(([key, value]) => [key.toLowerCase(), value]));
}

function classifyAnswersSessionTypeId(
  answers: ModificationBookingQuestionAnswer[],
  sessionTypeIdByQuestionId: ReadonlyMap<string, number | undefined>,
  questionIdsBySessionTypeId: ReadonlyMap<number, ReadonlySet<string>>,
  slotSessionTypeIds: ReadonlySet<number>,
): number | undefined {
  const explicitSessionTypeIds = new Set<number>();

  for (const answer of answers) {
    if (answer.sessionTypeId !== undefined && answer.sessionTypeId !== null) {
      explicitSessionTypeIds.add(answer.sessionTypeId);
    }
  }

  if (explicitSessionTypeIds.size === 1) {
    return [...explicitSessionTypeIds][0];
  }

  if (explicitSessionTypeIds.size > 1) {
    return undefined;
  }

  const catalogSessionTypeIds = new Set<number>();

  for (const answer of answers) {
    const sessionTypeId = sessionTypeIdByQuestionId.get(answer.questionId.toLowerCase());
    if (sessionTypeId !== undefined && sessionTypeId !== null && slotSessionTypeIds.has(sessionTypeId)) {
      catalogSessionTypeIds.add(sessionTypeId);
    }
  }

  if (catalogSessionTypeIds.size === 1) {
    return [...catalogSessionTypeIds][0];
  }

  if (answers.length === 0 || questionIdsBySessionTypeId.size === 0) {
    return undefined;
  }

  // Prefer the session type whose catalog exclusively covers every answer question id. The answers
  // come from the source tickets, so only the source's session types can own them, here and in the
  // catalog lookup above: a question shared with a type the source does not have no longer ties.
  const answerQuestionIds = answers.map(answer => answer.questionId.toLowerCase());
  const fittingSessionTypeIds = [...questionIdsBySessionTypeId.entries()]
    .filter(
      ([sessionTypeId, questionIds]) =>
        slotSessionTypeIds.has(sessionTypeId) && answerQuestionIds.every(questionId => questionIds.has(questionId)),
    )
    .map(([sessionTypeId]) => sessionTypeId);

  return fittingSessionTypeIds.length === 1 ? fittingSessionTypeIds[0] : undefined;
}

function normalizeQuestionIdsBySessionTypeId(
  questionIdsBySessionTypeId: ReadonlyMap<number, ReadonlySet<string>>,
): Map<number, ReadonlySet<string>> {
  return new Map(
    [...questionIdsBySessionTypeId.entries()].map(([sessionTypeId, questionIds]) => [
      sessionTypeId,
      new Set([...questionIds].map(questionId => questionId.toLowerCase())),
    ]),
  );
}

function groupSlotsBySessionTypeId(slots: ReadonlyArray<ModificationTicketSlot>): Map<number, ModificationTicketSlot[]> {
  const slotsBySessionTypeId = new Map<number, ModificationTicketSlot[]>();

  for (const slot of slots) {
    const typeSlots = slotsBySessionTypeId.get(slot.sessionTypeId) ?? [];
    typeSlots.push(slot);
    slotsBySessionTypeId.set(slot.sessionTypeId, typeSlots);
  }

  return slotsBySessionTypeId;
}

function buildCaseInsensitiveLabelLookup(questionLabelById: ReadonlyMap<string, string>): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const [questionId, label] of questionLabelById.entries()) {
    lookup.set(questionId, label);
    lookup.set(questionId.toLowerCase(), label);
  }

  return lookup;
}

export function applyPrefillToQuestions(
  questions: BookingQuestion[],
  answersForTicket: ModificationBookingQuestionAnswer[],
): BookingQuestion[] {
  if (answersForTicket.length === 0) {
    return questions.map(question => ({ ...question }));
  }

  const valuesByQuestionId = new Map(answersForTicket.map(answer => [answer.questionId.toLowerCase(), answer.values]));

  return questions.map(question => {
    const values = valuesByQuestionId.get(question.id.toLowerCase());
    return values !== undefined ? { ...question, defaultValues: values } : { ...question };
  });
}

/**
 * Prefills compacted `formData.perTicket` rows from kept/positional source indices.
 * Prefers matching form ticketDetails back to the target slot list; falls back to
 * compacted row index when object identity was lost (e.g. dialog data cloning).
 */
export function applyKeptPrefillToFormData(
  formData: BookingQuestionsFormData,
  keptSourceIndices: Array<number | undefined>,
  answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>,
  targetTicketDetails: BookingQuestionTicketDetails[],
): void {
  const formTicketDetails = formData.ticketDetails ?? [];

  formData.perTicket.forEach((questions, compactedIndex) => {
    const sourceIndex = resolveSourceIndexForFormRow(compactedIndex, formTicketDetails, targetTicketDetails, keptSourceIndices);

    if (sourceIndex === undefined) {
      return;
    }

    const answersForTicket = answersByTicketIndex[sourceIndex] ?? [];
    const prefilled = applyPrefillToQuestions(questions, answersForTicket);
    prefilled.forEach((question, questionIndex) => {
      questions[questionIndex] = question;
    });
  });
}

function resolveSourceIndexForFormRow(
  compactedIndex: number,
  formTicketDetails: BookingQuestionTicketDetails[],
  targetTicketDetails: BookingQuestionTicketDetails[],
  keptSourceIndices: Array<number | undefined>,
): number | undefined {
  const formTicketDetail = formTicketDetails[compactedIndex];

  if (formTicketDetail !== undefined) {
    const physicalIndex = targetTicketDetails.indexOf(formTicketDetail);
    if (physicalIndex >= 0) {
      return keptSourceIndices[physicalIndex];
    }

    const matchingTargetIndices = targetTicketDetails.flatMap((detail, index) =>
      detail.mainPlanId === formTicketDetail.mainPlanId &&
      detail.sessionType.id === formTicketDetail.sessionType.id &&
      detail.label === formTicketDetail.label
        ? [index]
        : [],
    );

    if (matchingTargetIndices.length > 0) {
      let occurrence = 0;
      for (let index = 0; index < compactedIndex; index += 1) {
        const prior = formTicketDetails[index];
        if (
          prior !== undefined &&
          prior.mainPlanId === formTicketDetail.mainPlanId &&
          prior.sessionType.id === formTicketDetail.sessionType.id &&
          prior.label === formTicketDetail.label
        ) {
          occurrence += 1;
        }
      }

      const matchedIndex = matchingTargetIndices[occurrence];
      if (matchedIndex !== undefined) {
        return keptSourceIndices[matchedIndex];
      }
    }
  }

  return keptSourceIndices[compactedIndex];
}

export function compileFullFinalBookingQuestionsAnswers(args: {
  answersPerOrder: ModificationBookingQuestionAnswer[];
  keptSourceIndices: Array<number | undefined>;
  answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>;
  editedAnswersByTargetIndex: Record<number, ModificationBookingQuestionAnswer[]>;
  targetCount: number;
  /** When set, drop answers whose question id is not allowed (FZ catalog + surviving GET answer ids). */
  allowedQuestionIds?: ReadonlySet<string>;
  /** Fallback session_type_id by question id when the answer snapshot omits it (undefined catalog values are ignored via ??). */
  sessionTypeIdByQuestionId?: ReadonlyMap<string, number | undefined>;
  /** Per-ticket session type (1-based). Used so unscoped questions still send the ticket's type. */
  sessionTypeIdByTargetIndex?: ReadonlyMap<number, number | undefined>;
}): ModificationCompiledBookingQuestionsAnswers {
  const answersPerTicket: ModificationCompiledBookingQuestionsAnswers['answers_per_ticket'] = [];
  const allowedQuestionIdsLower =
    args.allowedQuestionIds === undefined ? undefined : new Set([...args.allowedQuestionIds].map(questionId => questionId.toLowerCase()));
  const sessionTypeIdByQuestionIdLower =
    args.sessionTypeIdByQuestionId === undefined
      ? undefined
      : new Map(
          [...args.sessionTypeIdByQuestionId.entries()].map(([questionId, sessionTypeId]) => [questionId.toLowerCase(), sessionTypeId]),
        );
  const isAllowed = (questionId: string): boolean =>
    allowedQuestionIdsLower === undefined || allowedQuestionIdsLower.has(questionId.toLowerCase());
  const toCompiledAnswer = (answer: ModificationBookingQuestionAnswer, targetIndex?: number): ModificationCompiledBookingQuestionAnswer => {
    // A per-ticket answer belongs to its ticket's session type; the catalog can name another type when
    // the same question is configured on several.
    const sessionTypeId =
      answer.sessionTypeId ??
      (targetIndex !== undefined ? args.sessionTypeIdByTargetIndex?.get(targetIndex) : undefined) ??
      sessionTypeIdByQuestionIdLower?.get(answer.questionId.toLowerCase());
    return {
      question_id: answer.questionId,
      values: answer.values,
      ...(sessionTypeId !== undefined && sessionTypeId !== null ? { session_type_id: sessionTypeId } : {}),
    };
  };

  for (let targetIndex = 1; targetIndex <= args.targetCount; targetIndex += 1) {
    const editedAnswers = args.editedAnswersByTargetIndex[targetIndex];
    const keptSourceIndex = args.keptSourceIndices[targetIndex - 1];
    const keptAnswers = keptSourceIndex !== undefined ? (args.answersByTicketIndex[keptSourceIndex] ?? []) : [];
    // Dialog form only contains FZ-visible questions. Under BE replace semantics, prefer edited
    // values for those ids and retain GET answers for question ids the form never showed.
    let answers = keptAnswers;
    if (editedAnswers !== undefined) {
      const editedQuestionIdsLower = new Set(editedAnswers.map(answer => answer.questionId.toLowerCase()));
      answers = [...editedAnswers, ...keptAnswers.filter(keptAnswer => !editedQuestionIdsLower.has(keptAnswer.questionId.toLowerCase()))];
    }

    answersPerTicket.push({
      answers: answers.filter(answer => isAllowed(answer.questionId)).map(answer => toCompiledAnswer(answer, targetIndex)),
      ticket_index: targetIndex,
    });
  }

  return {
    answers_per_order: args.answersPerOrder.filter(answer => isAllowed(answer.questionId)).map(answer => toCompiledAnswer(answer)),
    answers_per_ticket: answersPerTicket,
  };
}

/**
 * FRM BQ fields shown in FeverZone are collected as required for modify.
 * Ensures every non-conditional question in the form has a non-empty answer before continuing.
 * Conditional children are always treated as complete (N/A) — ConditionalQuestionPipe may not
 * have removed unmet ones yet when silent-compile / delete-only skip evaluate the form.
 */
export function areModificationBookingQuestionsAnswersComplete(
  formData: {
    perOrder: {
      id: string;
      formControlId?: string;
      interactionConfiguration?: InteractionConfiguration;
      optional?: boolean;
      sessionTypeId?: number;
    }[];
    perTicket: {
      id: string;
      formControlId?: string;
      interactionConfiguration?: InteractionConfiguration;
      sessionTypeId?: number;
    }[][];
  },
  formGroup: { get: (controlId: string) => { value: unknown } | null },
): boolean {
  const isControlAnswered = (
    question: {
      id: string;
      formControlId?: string;
      interactionConfiguration?: InteractionConfiguration;
      sessionTypeId?: number;
    },
    ticketIndex?: number,
  ): boolean => {
    // Conditional children are N/A for completeness: ConditionalQuestionPipe may not
    // have removed unmet ones yet (silent-compile / delete-only skip), and filled ones
    // are optional. Missing non-conditional controls stay fail-closed below.
    if (isConditionalBookingQuestion(question)) {
      return true;
    }

    const controlId = getBookingQuestionControlId({
      questionId: question.id,
      sessionTypeId: question.sessionTypeId,
      ticketIndex,
    });
    const control = formGroup.get(controlId);

    if (control === null) {
      return false;
    }

    return hasNonEmptyAnswerValue(control.value);
  };

  // Per-order questions keep the plan's own flag (see `markModificationBookingQuestionsRequired`).
  if (!formData.perOrder.every(question => question.optional === true || isControlAnswered(question))) {
    return false;
  }

  return formData.perTicket.every((questions, ticketIndex) => questions.every(question => isControlAnswered(question, ticketIndex)));
}

/**
 * Delete-only shortcut: survivors already answered every FZ per-ticket question that
 * applies to their session type (conditionals ignored). Used so removal-only flows can
 * close without opening the answers step when GET data is already complete.
 */
export function areKeptTicketAnswersComplete(args: {
  keptSourceIndices: ReadonlyArray<number | undefined>;
  answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>;
  questions: ReadonlyArray<{
    id: string;
    frequency?: string;
    interactionConfiguration?: InteractionConfiguration;
    sessionTypeId?: number;
  }>;
  ticketDetails: ReadonlyArray<{ sessionType: { id: number } }>;
}): boolean {
  if (args.keptSourceIndices.length !== args.ticketDetails.length) {
    return false;
  }

  const perTicketQuestions = args.questions.filter(
    question => question.frequency === 'per_ticket' && !isConditionalBookingQuestion(question),
  );

  return args.keptSourceIndices.every((sourceIndex, targetOffset) => {
    if (sourceIndex === undefined) {
      return false;
    }

    const ticketSessionTypeId = args.ticketDetails[targetOffset]?.sessionType.id;
    if (ticketSessionTypeId === undefined) {
      return false;
    }

    const answers = args.answersByTicketIndex[sourceIndex] ?? [];
    const applicableQuestions = perTicketQuestions.filter(
      question => question.sessionTypeId === undefined || question.sessionTypeId === ticketSessionTypeId,
    );

    return applicableQuestions.every(question => {
      const answer = answers.find(candidate => candidate.questionId.toLowerCase() === question.id.toLowerCase());
      return answer !== undefined && answer.values.some(value => value.trim().length > 0);
    });
  });
}

/**
 * Per-ticket questions only. Per-order questions keep the plan's own flag: the form only carries the
 * ones `selectPerOrderQuestionsToCollect` picked, and an optional part of a composite (an address's
 * second line) must stay optional.
 */
export function markModificationBookingQuestionsRequired(formData: {
  perTicket: { optional: boolean; interactionConfiguration?: InteractionConfiguration }[][];
}): void {
  formData.perTicket.forEach(ticketQuestions => {
    ticketQuestions.forEach(question => {
      if (isConditionalBookingQuestion(question)) {
        return;
      }
      question.optional = false;
    });
  });
}

/**
 * The per-order questions a modification has to ask: every mandatory one the source answers leave
 * empty. Per-order answers are otherwise forwarded from the answers GET, so a mandatory question the
 * source order never answered (one that only applies to the new session type, or one added to the
 * plan later) reaches the cart write empty and the backend rejects the whole answers group.
 *
 * A composite (an address lookup) is asked as a whole, so its other parts come along, and so do the
 * conditional children of every collected question, so the form can show them when triggered.
 */
export function selectPerOrderQuestionsToCollect(
  questions: BookingQuestion[],
  answersPerOrder: ModificationBookingQuestionAnswer[],
): BookingQuestion[] {
  const perOrderQuestions = mergeBookingQuestionsPrioritizingMandatory(questions.filter(question => question.frequency === 'per_order'));
  const answeredQuestionIds = new Set(
    answersPerOrder.filter(answer => answer.values.some(value => value.trim().length > 0)).map(answer => answer.questionId.toLowerCase()),
  );
  const missingMandatoryQuestions = perOrderQuestions.filter(
    question => !question.optional && !isConditionalBookingQuestion(question) && !answeredQuestionIds.has(question.id.toLowerCase()),
  );

  if (missingMandatoryQuestions.length === 0) {
    return [];
  }

  const compositeTemplateIds = new Set(missingMandatoryQuestions.flatMap(question => getCompositeTemplateIds(question)));
  const collectedQuestionIds = new Set(
    perOrderQuestions
      .filter(
        question =>
          missingMandatoryQuestions.includes(question) || getCompositeTemplateIds(question).some(id => compositeTemplateIds.has(id)),
      )
      .map(question => question.id.toLowerCase()),
  );

  // A conditional child can itself be a parent, so repeat until no question joins.
  let hasCollectedChild = true;
  while (hasCollectedChild) {
    const children = perOrderQuestions.filter(question => {
      const parentId = getConditionalParentQuestionId(question);
      return (
        parentId !== undefined && collectedQuestionIds.has(parentId.toLowerCase()) && !collectedQuestionIds.has(question.id.toLowerCase())
      );
    });
    children.forEach(question => collectedQuestionIds.add(question.id.toLowerCase()));
    hasCollectedChild = children.length > 0;
  }

  return perOrderQuestions.filter(question => collectedQuestionIds.has(question.id.toLowerCase()));
}

/** The GET passthrough with every answer the dialog collected taking its question's place. */
export function mergeEditedAnswersPerOrder(
  answersPerOrder: ModificationBookingQuestionAnswer[],
  editedAnswersPerOrder: ModificationBookingQuestionAnswer[],
): ModificationBookingQuestionAnswer[] {
  const editedQuestionIds = new Set(editedAnswersPerOrder.map(answer => answer.questionId.toLowerCase()));

  return [...answersPerOrder.filter(answer => !editedQuestionIds.has(answer.questionId.toLowerCase())), ...editedAnswersPerOrder];
}

function getCompositeTemplateIds(question: { interactionConfiguration?: InteractionConfiguration }): string[] {
  return question.interactionConfiguration?.interactionMode === BookingQuestionInteractionMode.COMPOSITE_QUESTION
    ? [question.interactionConfiguration.templateId]
    : [];
}

function getConditionalParentQuestionId(question: { interactionConfiguration?: InteractionConfiguration }): string | undefined {
  return question.interactionConfiguration?.interactionMode === BookingQuestionInteractionMode.CONDITIONAL_QUESTION
    ? question.interactionConfiguration.parentBookingQuestionId
    : undefined;
}

function isConditionalBookingQuestion(question: { interactionConfiguration?: InteractionConfiguration }): boolean {
  return question.interactionConfiguration?.interactionMode === BookingQuestionInteractionMode.CONDITIONAL_QUESTION;
}

/**
 * Prefills per-ticket form questions from cart answers.
 * `sourceIndicesByTargetSlot` is 1-based ticket indices from the baseline answers map,
 * one entry per target form slot (`undefined` = new slot with no survivor).
 */
export function applyAnswersPrefillToFormData(
  formData: {
    perTicket: BookingQuestion[][];
  },
  answersByTicketIndex: Record<number, ModificationBookingQuestionAnswer[]>,
  sourceIndicesByTargetSlot: ReadonlyArray<number | undefined>,
): void {
  formData.perTicket.forEach((questions, targetIndex) => {
    const sourceIndex = sourceIndicesByTargetSlot[targetIndex];

    if (sourceIndex === undefined) {
      return;
    }

    const answersForTicket = answersByTicketIndex[sourceIndex] ?? [];
    const prefilled = applyPrefillToQuestions(questions, answersForTicket);
    prefilled.forEach((question, questionIndex) => {
      questions[questionIndex] = question;
    });
  });
}

/**
 * Add-only / same-count qty delta: map each target slot to the next unused baseline
 * source index of the same session type. New slots within a type get `undefined`.
 */
export function buildTypeAwareSourceIndices(
  sourceRows: ReadonlyArray<{ sourceIndex: number; sessionTypeId: number; autoRemoved?: boolean }>,
  targetSessionTypeIds: readonly number[],
): Array<number | undefined> {
  const availableBySessionTypeId = new Map<number, number[]>();

  for (const row of sourceRows) {
    if (row.autoRemoved === true) {
      continue;
    }

    const queue = availableBySessionTypeId.get(row.sessionTypeId) ?? [];
    queue.push(row.sourceIndex);
    availableBySessionTypeId.set(row.sessionTypeId, queue);
  }

  return targetSessionTypeIds.map(sessionTypeId => {
    const queue = availableBySessionTypeId.get(sessionTypeId);
    if (queue === undefined || queue.length === 0) {
      return undefined;
    }

    return queue.shift();
  });
}

/**
 * Copies `defaultValues` onto existing form controls (needed after remapping kept attendees,
 * and as a belt-and-suspenders when controls were created before prefill landed).
 */
export function applyAnswersPrefillToFormGroup(
  formGroup: { get: (controlId: string) => { setValue: (value: unknown) => void } | null },
  formData: {
    perOrder?: {
      id: string;
      type: string;
      defaultValues?: unknown[] | null;
      sessionTypeId?: number;
    }[];
    perTicket: {
      id: string;
      type: string;
      defaultValues?: unknown[] | null;
      formControlId?: string;
      sessionTypeId?: number;
    }[][];
  },
): void {
  formData.perOrder?.forEach(question => {
    if (!question.defaultValues?.length) {
      return;
    }

    formGroup
      .get(getBookingQuestionControlId({ questionId: question.id, sessionTypeId: question.sessionTypeId }))
      ?.setValue(resolvePrefillControlValue(question.type, question.defaultValues));
  });

  formData.perTicket.forEach((questions, ticketIndex) => {
    questions.forEach(question => {
      if (!question.defaultValues?.length) {
        return;
      }

      const controlId = getBookingQuestionControlId({
        questionId: question.id,
        sessionTypeId: question.sessionTypeId,
        ticketIndex,
      });
      const control = formGroup.get(controlId);

      if (control === null) {
        return;
      }

      control.setValue(resolvePrefillControlValue(question.type, question.defaultValues));
    });
  });
}

function resolvePrefillControlValue(questionType: string, defaultValues: unknown[]): unknown {
  if (questionType === 'single_choice') {
    return { choice: defaultValues[0] };
  }

  if (questionType === 'multiple_choice') {
    return resolveMultipleChoicePrefillControlValue(defaultValues);
  }

  if (questionType === 'tel') {
    return resolveTelPrefillControlValue(defaultValues);
  }

  return defaultValues[0];
}

/**
 * Multiple-choice controls store `{ choices, additionalQuestions }`.
 * Cart / compile prefill supplies selected choice ids as a flat `defaultValues` string[].
 */
function resolveMultipleChoicePrefillControlValue(defaultValues: unknown[]): { choices: string[]; additionalQuestions: unknown[] | null } {
  const first = defaultValues[0];
  if (typeof first === 'object' && first !== null && !Array.isArray(first) && 'choices' in first) {
    const shaped = first as { additionalQuestions?: unknown; choices: unknown };
    return {
      additionalQuestions: Array.isArray(shaped.additionalQuestions) ? shaped.additionalQuestions : null,
      choices: Array.isArray(shaped.choices)
        ? shaped.choices.filter((choice): choice is string => typeof choice === 'string' && choice.length > 0)
        : [],
    };
  }

  return {
    additionalQuestions: null,
    choices: defaultValues.filter((value): value is string => typeof value === 'string' && value.length > 0),
  };
}

function resolveTelPrefillControlValue(
  defaultValues: unknown,
): { country: string | null; phone: string | null; prefix: string | null } | null {
  if (defaultValues === null || defaultValues === undefined) {
    return null;
  }

  if (typeof defaultValues === 'object' && !Array.isArray(defaultValues) && 'phone' in defaultValues) {
    return defaultValues as { country: string | null; phone: string | null; prefix: string | null };
  }

  if (!Array.isArray(defaultValues) || defaultValues.length === 0) {
    return null;
  }

  const [phoneWithPrefix, countryValue] = defaultValues;
  if (typeof phoneWithPrefix !== 'string' || !phoneWithPrefix.includes('|')) {
    return null;
  }

  const separatorIndex = phoneWithPrefix.indexOf('|');
  return {
    country: typeof countryValue === 'string' ? countryValue : null,
    phone: phoneWithPrefix.slice(separatorIndex + 1),
    prefix: phoneWithPrefix.slice(0, separatorIndex),
  };
}

function hasNonEmptyAnswerValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 && value !== 'false';
  }

  if (Array.isArray(value)) {
    return value.some(entry => hasNonEmptyAnswerValue(entry));
  }

  if (typeof value === 'object') {
    // multiple_choice stores `{ choices: string[], additionalQuestions }`
    if ('choices' in value) {
      return hasNonEmptyAnswerValue((value as { choices: unknown }).choices);
    }

    // single_choice stores `{ choice: string | null }`
    if ('choice' in value) {
      return hasNonEmptyAnswerValue((value as { choice: unknown }).choice);
    }

    // tel stores `{ phone, country, prefix }` — only the phone number counts as answered
    if ('phone' in value) {
      return hasNonEmptyAnswerValue((value as { phone: unknown }).phone);
    }

    return false;
  }

  return false;
}

function buildQuantityBySessionTypeId(selections: ReadonlyArray<{ sessionTypeId: number; quantity: number }>): Map<number, number> {
  const quantityBySessionTypeId = new Map<number, number>();

  for (const selection of selections) {
    quantityBySessionTypeId.set(selection.sessionTypeId, (quantityBySessionTypeId.get(selection.sessionTypeId) ?? 0) + selection.quantity);
  }

  return quantityBySessionTypeId;
}

function countSlotsBySessionTypeId(slots: ModificationTicketSlot[]): Map<number, number> {
  const countBySessionTypeId = new Map<number, number>();

  for (const slot of slots) {
    countBySessionTypeId.set(slot.sessionTypeId, (countBySessionTypeId.get(slot.sessionTypeId) ?? 0) + 1);
  }

  return countBySessionTypeId;
}

function buildAttendeeAnswerLines(
  answers: { questionId: string; questionLabel?: string; values: string[] }[] | undefined,
  questionLabelById: ReadonlyMap<string, string>,
): string[] {
  if (answers === undefined || answers.length === 0) {
    return [];
  }

  return answers
    .map(answer => {
      const valuesText = answer.values.filter(value => value.trim().length > 0).join(', ');

      if (valuesText.length === 0) {
        return null;
      }

      const questionLabel =
        (answer.questionLabel !== undefined && answer.questionLabel.length > 0 ? answer.questionLabel : undefined) ??
        questionLabelById.get(answer.questionId) ??
        questionLabelById.get(answer.questionId.toLowerCase());

      return questionLabel !== undefined && questionLabel.length > 0 ? `${questionLabel}: ${valuesText}` : valuesText;
    })
    .filter((line): line is string => line !== null);
}
