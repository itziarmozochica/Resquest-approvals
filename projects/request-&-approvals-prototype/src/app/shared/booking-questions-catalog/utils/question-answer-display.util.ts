import { formatDate } from '@angular/common';

import { CustomerQuestionType } from '../models/customer-question-type.enum';
import { formatTelAnswer } from './question-answer-tel.util';

const readingDateFormat = 'd MMM y';

/** Answers travel in the format the checkout submits them; reading them wants the display one. */
export function formatAnswerForReading(type: CustomerQuestionType, value: string[], locale: string): string {
  switch (type) {
    case CustomerQuestionType.DATE:
      return formatDateAnswer(value[0] ?? '', locale);
    case CustomerQuestionType.TEL:
      return formatTelAnswer(value);
    default:
      return value[0] ?? '';
  }
}

function formatDateAnswer(value: string, locale: string): string {
  if (value === '') {
    return '';
  }

  try {
    // No timezone argument on purpose: Angular reads a `yyyy-MM-dd` answer as local midnight, so
    // the calendar day it prints is the one that was answered. Forcing UTC would move it.
    return formatDate(value, readingDateFormat, locale);
  } catch {
    return value;
  }
}
