import { FormControl } from '@angular/forms';

import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';
import {
  OrderAnswerInput,
  OrderAnswersInput,
  OrderTicketAnswerInput,
} from '@fz-original/app/shared/booking-questions-catalog/models/order-answers-input.model';
import { QuestionAnswerValue } from '@fz-original/app/shared/booking-questions-catalog/models/question-answer-value.model';
import { isAnswerEditable } from '@fz-original/app/shared/booking-questions-catalog/utils/question-answer-editability.util';
import { QuestionFrequency } from '@fz-original/app/shared/main-plan-questions/models/question-frequency.enum';

import { OrderResponseEntry, OrderResponseSection } from '../models/order-responses-view.model';

export type OrderResponseControls = Map<string, FormControl<QuestionAnswerValue>>;

export function isEditable(entry: OrderResponseEntry): boolean {
  return isAnswerEditable(entry.question.type);
}

/** The endpoint upserts and never deletes, so an answer already given survives being left out of the payload. */
export function isClearable(entry: OrderResponseEntry): boolean {
  return !isAnswered(toAnswerValue(entry));
}

export function isSectionSavable(section: OrderResponseSection, controls: OrderResponseControls): boolean {
  return (
    !section.hasHiddenRequired &&
    [...controls.values()].every(control => control.valid) &&
    missingRequiredEntries(section, controls).length === 0
  );
}

export function missingRequiredEntries(section: OrderResponseSection, controls: OrderResponseControls): OrderResponseEntry[] {
  return savedEntries(section).filter(entry => entry.required && !hasAnswer(entry, controls));
}

export function buildSectionControls(section: OrderResponseSection): OrderResponseControls {
  const controls: OrderResponseControls = new Map();

  for (const entry of sectionEntries(section).filter(isEditable)) {
    controls.set(entry.key, new FormControl<QuestionAnswerValue>(toAnswerValue(entry), { nonNullable: true }));
  }

  return controls;
}

export function toOrderAnswersInput(section: OrderResponseSection, controls: OrderResponseControls): OrderAnswersInput {
  const answered = savedEntries(section)
    // A photo cannot be sent back, and the upsert keeps the one already given, so leaving it out is how it survives the save.
    .filter(entry => entry.question.type !== CustomerQuestionType.IMAGE)
    .map(entry => ({ entry, value: valueOf(entry, controls) }))
    .filter(({ value }) => isAnswered(value));

  const answersPerOrder: OrderAnswerInput[] = answered
    .filter(({ entry }) => entry.ticketIndex === null)
    .map(({ entry, value }) => toAnswerInput(entry, value));

  const answersPerTicket = new Map<number, OrderTicketAnswerInput[]>();
  for (const { entry, value } of answered) {
    if (entry.ticketIndex === null) {
      continue;
    }

    answersPerTicket.set(entry.ticketIndex, [
      ...(answersPerTicket.get(entry.ticketIndex) ?? []),
      { ...toAnswerInput(entry, value), ticketIndex: entry.ticketIndex },
    ]);
  }

  return {
    answersPerOrder,
    answersPerTicket: ticketGroups(answersPerTicket),
  };
}

/** A photo answers its question by existing: it carries a file and no value. */
function hasAnswer(entry: OrderResponseEntry, controls: OrderResponseControls): boolean {
  return entry.answer?.file != null || isAnswered(valueOf(entry, controls));
}

function isAnswered(value: QuestionAnswerValue): boolean {
  return value.value.some(item => item.trim() !== '');
}

/** Only the tickets with something to say: each answer names its own, and an empty group is one the server refuses as incomplete. */
function ticketGroups(answersPerTicket: Map<number, OrderTicketAnswerInput[]>): OrderTicketAnswerInput[][] {
  return [...answersPerTicket.entries()].sort(([left], [right]) => left - right).map(([, answers]) => answers);
}

export function toAnswerValue(entry: OrderResponseEntry): QuestionAnswerValue {
  return { additionalAnswers: entry.answer?.choiceAdditionalQuestionAnswers ?? [], value: entry.answer?.value ?? [] };
}

function sectionEntries(section: OrderResponseSection): OrderResponseEntry[] {
  return section.frequencies.flatMap(group =>
    group.frequency === QuestionFrequency.PER_ORDER ? group.entries : group.tickets.flatMap(ticket => ticket.entries),
  );
}

function savedEntries(section: OrderResponseSection): OrderResponseEntry[] {
  return sectionEntries(section);
}

function valueOf(entry: OrderResponseEntry, controls: OrderResponseControls): QuestionAnswerValue {
  return controls.get(entry.key)?.value ?? toAnswerValue(entry);
}

function toAnswerInput(entry: OrderResponseEntry, value: QuestionAnswerValue): OrderAnswerInput {
  return {
    choiceAdditionalQuestionAnswers: value.additionalAnswers,
    questionId: entry.question.id,
    sessionTypeId: entry.mainPlanQuestion.sessionTypeId,
    value: value.value,
  };
}
