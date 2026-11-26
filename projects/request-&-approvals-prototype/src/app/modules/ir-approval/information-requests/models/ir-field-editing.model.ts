import { InformationRequestQuestion } from './information-request-question.model';
import { isAnswerPresent } from './question-answer.util';

export type IrFieldActionType = 'add' | 'remove' | 'required' | 'undoAdd' | 'undoRemove';

export interface IrFieldAction {
  questionId: string;
  required?: boolean;
  type: IrFieldActionType;
}

export interface IrFieldEditingState {
  lockedRemovalIds: string[];
  lockedRequiredIds: string[];
  pendingAdd: string[];
  pendingRemove: string[];
  pendingRequired: Record<string, boolean>;
}

export const EMPTY_FIELD_EDITING_STATE: IrFieldEditingState = {
  lockedRemovalIds: [],
  lockedRequiredIds: [],
  pendingAdd: [],
  pendingRemove: [],
  pendingRequired: {},
};

export function isQuestionAnswered(question: InformationRequestQuestion): boolean {
  const answer = typeof question.answer === 'string' ? question.answer.trim() : question.answer;
  return isAnswerPresent(question.type, answer);
}

export function effectiveRequired(question: InformationRequestQuestion, state: IrFieldEditingState): boolean {
  return state.pendingRequired[question.id] ?? question.required;
}

export function isRequiredLocked(question: InformationRequestQuestion, state: IrFieldEditingState): boolean {
  return state.lockedRequiredIds.includes(question.id);
}

export function isRemovable(question: InformationRequestQuestion, state: IrFieldEditingState): boolean {
  return !isQuestionAnswered(question) && !state.lockedRemovalIds.includes(question.id);
}

export function removalBlockedKey(question: InformationRequestQuestion, state: IrFieldEditingState): string | null {
  if (isQuestionAnswered(question)) {
    return 'informationRequests.detail.fieldConfig.removeBlockedAnswered';
  }
  if (state.lockedRemovalIds.includes(question.id)) {
    return 'informationRequests.detail.fieldConfig.removeBlockedLocked';
  }
  return null;
}

export function hasPendingFieldEdits(state: IrFieldEditingState): boolean {
  return Object.keys(state.pendingRequired).length > 0 || state.pendingAdd.length > 0 || state.pendingRemove.length > 0;
}
