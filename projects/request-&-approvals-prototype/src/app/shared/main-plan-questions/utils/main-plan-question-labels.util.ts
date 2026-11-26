import { AutoAnswerFrom } from '../models/auto-answer-from.enum';
import { QuestionFrequency } from '../models/question-frequency.enum';
import { QuestionWhen } from '../models/question-when.enum';

const WHEN_LABEL_KEYS: Partial<Record<QuestionWhen, string>> = {
  [QuestionWhen.CHECK_IN]: 'mainPlanQuestions.when.checkIn',
  [QuestionWhen.POST_BOOKING]: 'mainPlanQuestions.when.postBooking',
  [QuestionWhen.PRE_BOOKING]: 'mainPlanQuestions.when.preBooking',
};

const WHEN_FORM_TITLE_KEYS: Partial<Record<QuestionWhen, string>> = {
  [QuestionWhen.CHECK_IN]: 'mainPlanQuestions.whenForm.checkIn',
  [QuestionWhen.POST_BOOKING]: 'mainPlanQuestions.whenForm.postBooking',
  [QuestionWhen.PRE_BOOKING]: 'mainPlanQuestions.whenForm.preBooking',
};

const WHEN_SUBTITLE_KEYS: Partial<Record<QuestionWhen, string>> = {
  [QuestionWhen.CHECK_IN]: 'mainPlanQuestions.whenSubtitle.checkIn',
  [QuestionWhen.POST_BOOKING]: 'mainPlanQuestions.whenSubtitle.postBooking',
  [QuestionWhen.PRE_BOOKING]: 'mainPlanQuestions.whenSubtitle.preBooking',
};

const FREQUENCY_LABEL_KEYS: Record<QuestionFrequency, string> = {
  [QuestionFrequency.PER_ORDER]: 'mainPlanQuestions.frequency.perOrder',
  [QuestionFrequency.PER_TICKET]: 'mainPlanQuestions.frequency.perTicket',
};

const FREQUENCY_DESCRIPTION_KEYS: Record<QuestionFrequency, string> = {
  [QuestionFrequency.PER_ORDER]: 'mainPlanQuestions.frequencyDescription.perOrder',
  [QuestionFrequency.PER_TICKET]: 'mainPlanQuestions.frequencyDescription.perTicket',
};

const FREQUENCY_ICONS: Record<QuestionFrequency, string> = {
  [QuestionFrequency.PER_ORDER]: 'receipt',
  [QuestionFrequency.PER_TICKET]: 'ticket',
};

const AUTO_ANSWER_FROM_LABEL_KEYS: Record<AutoAnswerFrom, string> = {
  [AutoAnswerFrom.USER_DATE_OF_BIRTH]: 'mainPlanQuestions.autoAnswerFrom.userDateOfBirth',
  [AutoAnswerFrom.USER_EMAIL]: 'mainPlanQuestions.autoAnswerFrom.userEmail',
  [AutoAnswerFrom.USER_FEVER_WALLET]: 'mainPlanQuestions.autoAnswerFrom.userFeverWallet',
  [AutoAnswerFrom.USER_FIRST_NAME]: 'mainPlanQuestions.autoAnswerFrom.userFirstName',
  [AutoAnswerFrom.USER_LAST_NAME]: 'mainPlanQuestions.autoAnswerFrom.userLastName',
  [AutoAnswerFrom.USER_LINKED_WRISTBAND]: 'mainPlanQuestions.autoAnswerFrom.userLinkedWristband',
  [AutoAnswerFrom.USER_PHONE_NUMBER]: 'mainPlanQuestions.autoAnswerFrom.userPhoneNumber',
  [AutoAnswerFrom.USER_PLACE_OF_BIRTH]: 'mainPlanQuestions.autoAnswerFrom.userPlaceOfBirth',
};

export const AUTO_ANSWER_FROM_VALUES: AutoAnswerFrom[] = [
  AutoAnswerFrom.USER_FIRST_NAME,
  AutoAnswerFrom.USER_LAST_NAME,
  AutoAnswerFrom.USER_EMAIL,
  AutoAnswerFrom.USER_PHONE_NUMBER,
  AutoAnswerFrom.USER_DATE_OF_BIRTH,
  AutoAnswerFrom.USER_PLACE_OF_BIRTH,
  AutoAnswerFrom.USER_LINKED_WRISTBAND,
  AutoAnswerFrom.USER_FEVER_WALLET,
];

export function getAutoAnswerFromLabelKey(autoAnswerFrom: AutoAnswerFrom): string {
  return AUTO_ANSWER_FROM_LABEL_KEYS[autoAnswerFrom];
}

export function getWhenLabelKey(when: QuestionWhen): string {
  return WHEN_LABEL_KEYS[when] ?? '';
}

export function getWhenFormTitleKey(when: QuestionWhen): string {
  return WHEN_FORM_TITLE_KEYS[when] ?? '';
}

export function getWhenSubtitleKey(when: QuestionWhen): string {
  return WHEN_SUBTITLE_KEYS[when] ?? '';
}

export function getFrequencyLabelKey(frequency: QuestionFrequency): string {
  return FREQUENCY_LABEL_KEYS[frequency];
}

export function getFrequencyDescriptionKey(frequency: QuestionFrequency): string {
  return FREQUENCY_DESCRIPTION_KEYS[frequency];
}

export function getFrequencyIcon(frequency: QuestionFrequency): string {
  return FREQUENCY_ICONS[frequency];
}
