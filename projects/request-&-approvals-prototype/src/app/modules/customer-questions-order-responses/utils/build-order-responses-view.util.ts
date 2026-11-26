import { BookingQuestionAnswer } from '@fz-original/app/shared/booking-questions-catalog/models/booking-question-answer.model';
import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';
import { MainPlanQuestion } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question.model';
import { QuestionFrequency } from '@fz-original/app/shared/main-plan-questions/models/question-frequency.enum';
import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';

import {
  OrderResponseEntry,
  OrderResponseFrequencyGroup,
  OrderResponseSection,
  OrderResponsesView,
  OrderResponseTicketGroup,
} from '../models/order-responses-view.model';

/** The forms the order is asked about. `enquiry` is not part of an order's answers. */
export const orderResponseSections: QuestionWhen[] = [QuestionWhen.PRE_BOOKING, QuestionWhen.POST_BOOKING, QuestionWhen.CHECK_IN];

export interface OrderResponsesInput {
  answers: BookingQuestionAnswer[];
  mainPlanQuestions: MainPlanQuestion[];
  ticketCount: number;
  ticketSessionTypeIds: (number | null)[];
}

export function buildOrderResponsesView(input: OrderResponsesInput): OrderResponsesView {
  const asked = askedQuestions(input.mainPlanQuestions, input.answers);
  const questions = asked.filter(question => question.bookingQuestion.allowedCapabilities.canViewAnswers);
  const hidden = asked.filter(question => !question.bookingQuestion.allowedCapabilities.canViewAnswers);
  const answers = indexAnswers(input.answers);
  const sections = orderResponseSections.map(when =>
    buildSection(when, questions, hidden, answers, input.ticketCount, input.ticketSessionTypeIds),
  );
  const entries = sections
    .flatMap(section => section.frequencies)
    .flatMap(group => [...group.entries, ...group.tickets.flatMap(t => t.entries)]);

  return {
    answeredCount: entries.filter(entry => entry.answer !== null).length,
    questionCount: entries.length,
    sections,
  };
}

function askedQuestions(mainPlanQuestions: MainPlanQuestion[], answers: BookingQuestionAnswer[]): MainPlanQuestion[] {
  const byId = new Map(mainPlanQuestions.map(question => [question.id, question]));

  for (const { mainPlanQuestion } of answers) {
    if (mainPlanQuestion && !byId.has(mainPlanQuestion.id)) {
      byId.set(mainPlanQuestion.id, mainPlanQuestion);
    }
  }

  return [...byId.values()];
}

function answerKey(mainPlanQuestionId: number, ticketIndex: number | null): string {
  return `${mainPlanQuestionId}#${ticketIndex ?? 'order'}`;
}

function buildEntries(
  questions: MainPlanQuestion[],
  answers: Map<string, BookingQuestionAnswer>,
  ticketIndex: number | null,
  slotSessionTypeId: number | null = null,
): OrderResponseEntry[] {
  return questions.map((mainPlanQuestion, index) => ({
    answer: answers.get(answerKey(mainPlanQuestion.id, ticketIndex)) ?? null,
    key: answerKey(mainPlanQuestion.id, ticketIndex),
    mainPlanQuestion,
    position: index + 1,
    question: mainPlanQuestion.bookingQuestion,
    required: isRequiredOnSlot(mainPlanQuestion, slotSessionTypeId),
    ticketIndex,
  }));
}

/** Whether the server will refuse the section without this answer: it skips a session-scoped question on a ticket that does not declare that type. */
function isRequiredOnSlot(question: MainPlanQuestion, slotSessionTypeId: number | null): boolean {
  if (question.optional) {
    return false;
  }

  if (question.frequency !== QuestionFrequency.PER_TICKET) {
    return true;
  }

  return question.sessionTypeId === null || question.sessionTypeId === slotSessionTypeId;
}

function buildSection(
  when: QuestionWhen,
  questions: MainPlanQuestion[],
  hidden: MainPlanQuestion[],
  answers: Map<string, BookingQuestionAnswer>,
  ticketCount: number,
  ticketSessionTypeIds: (number | null)[],
): OrderResponseSection {
  const inSection = questions.filter(question => question.when === when).sort(byOrder);
  const perOrder = inSection.filter(question => question.frequency === QuestionFrequency.PER_ORDER);
  const perTicket = inSection.filter(question => question.frequency === QuestionFrequency.PER_TICKET);

  const frequencies: OrderResponseFrequencyGroup[] = [
    { entries: buildEntries(perOrder, answers, null), frequency: QuestionFrequency.PER_ORDER, tickets: [] },
    {
      entries: [],
      frequency: QuestionFrequency.PER_TICKET,
      tickets: buildTicketGroups(perTicket, answers, ticketCount, ticketSessionTypeIds),
    },
  ];

  return {
    frequencies,
    hasQuestions: inSection.length > 0,
    hasHiddenRequired: hasHiddenRequired(when, hidden, ticketCount, ticketSessionTypeIds),
    hasUnsavableImage: hasUnsavableImage(frequencies),
    when,
  };
}

/** No photo is ever sent back, and the endpoint refuses a form missing a required answer, so a required one locks the whole section. */
function hasUnsavableImage(frequencies: OrderResponseFrequencyGroup[]): boolean {
  return frequencies
    .flatMap(group => [...group.entries, ...group.tickets.flatMap(ticket => ticket.entries)])
    .some(entry => entry.question.type === CustomerQuestionType.IMAGE && entry.required);
}

/** The answers endpoint drops what the reader may not view, so such a question can never be sent back and the server refuses the section without it. */
function hasHiddenRequired(
  when: QuestionWhen,
  hidden: MainPlanQuestion[],
  ticketCount: number,
  ticketSessionTypeIds: (number | null)[],
): boolean {
  return hidden
    .filter(question => question.when === when)
    .some(question =>
      question.frequency === QuestionFrequency.PER_TICKET
        ? Array.from({ length: ticketCount }, (_, slot) => ticketSessionTypeIds[slot] ?? null).some(sessionTypeId =>
            isRequiredOnSlot(question, sessionTypeId),
          )
        : isRequiredOnSlot(question, null),
    );
}

function buildTicketGroups(
  questions: MainPlanQuestion[],
  answers: Map<string, BookingQuestionAnswer>,
  ticketCount: number,
  ticketSessionTypeIds: (number | null)[],
): OrderResponseTicketGroup[] {
  if (questions.length === 0) {
    return [];
  }

  return ticketIndexes(questions, answers, ticketCount)
    .map(ticketIndex => {
      const sessionTypeId = ticketSessionTypeIds[ticketIndex - 1] ?? null;

      return {
        entries: buildEntries(
          forTicket(questions, answers, ticketIndex, sessionTypeId, ticketIndex <= ticketCount),
          answers,
          ticketIndex,
          sessionTypeId,
        ),
        ticketIndex,
      };
    })
    .filter(group => group.entries.length > 0);
}

/** Only the answers to this form's questions speak for a ticket here: one answered before booking was not asked at check-in. */
function ticketIndexes(questions: MainPlanQuestion[], answers: Map<string, BookingQuestionAnswer>, ticketCount: number): number[] {
  const questionIds = new Set(questions.map(question => question.id));
  const fromCart = Array.from({ length: ticketCount }, (_, index) => index + 1);
  const fromAnswers = [...answers.values()]
    .filter(answer => answer.mainPlanQuestion !== null && questionIds.has(answer.mainPlanQuestion.id))
    .map(answer => answer.ticketIndex)
    .filter((index): index is number => index !== null);

  return [...new Set([...fromCart, ...fromAnswers])].sort((left, right) => left - right);
}

/** An unknown session type opens the form to every question, but a ticket the cart no longer holds has none to match. */
function forTicket(
  questions: MainPlanQuestion[],
  answers: Map<string, BookingQuestionAnswer>,
  ticketIndex: number,
  sessionTypeId: number | null,
  heldByCart: boolean,
): MainPlanQuestion[] {
  return questions.filter(
    question =>
      question.sessionTypeId === null ||
      question.sessionTypeId === sessionTypeId ||
      (sessionTypeId === null && heldByCart) ||
      answers.has(answerKey(question.id, ticketIndex)),
  );
}

function byOrder(left: MainPlanQuestion, right: MainPlanQuestion): number {
  return (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER);
}

function indexAnswers(answers: BookingQuestionAnswer[]): Map<string, BookingQuestionAnswer> {
  const indexed = new Map<string, BookingQuestionAnswer>();

  for (const answer of answers) {
    if (answer.mainPlanQuestion) {
      indexed.set(answerKey(answer.mainPlanQuestion.id, answer.ticketIndex), answer);
    }
  }

  return indexed;
}
