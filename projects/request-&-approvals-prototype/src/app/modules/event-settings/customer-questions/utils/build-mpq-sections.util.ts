import { buildNodes, buildNodeViews } from '@fz-original/app/shared/grouping/ordered-group';
import { GroupSection } from '@fz-original/app/shared/grouping/sectioned-group';
import { MainPlanQuestion } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question.model';
import { QuestionFrequency } from '@fz-original/app/shared/main-plan-questions/models/question-frequency.enum';
import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';

import { MpqDisplay, MpqWhenSection } from '../models/event-customer-questions-view.model';

export const WHEN_ORDER: QuestionWhen[] = [QuestionWhen.PRE_BOOKING, QuestionWhen.POST_BOOKING, QuestionWhen.CHECK_IN];
export const FREQUENCY_ORDER: QuestionFrequency[] = [QuestionFrequency.PER_ORDER, QuestionFrequency.PER_TICKET];

export type MpqSectionState = GroupSection<MpqDisplay, string>;

export function sectionKey(when: QuestionWhen, frequency: QuestionFrequency): string {
  return `${when}|${frequency}`;
}

export function parseSectionKey(key: string): { frequency: QuestionFrequency; when: QuestionWhen } {
  const [when, frequency] = key.split('|');

  return { frequency: frequency as QuestionFrequency, when: when as QuestionWhen };
}

export function buildSectionState(questions: MainPlanQuestion[], canAssign: boolean, newClusterId: () => string): MpqSectionState[] {
  return WHEN_ORDER.flatMap(when =>
    FREQUENCY_ORDER.map(frequency => {
      const leaves = questions
        .filter(question => question.when === when && question.frequency === frequency)
        .map(question => ({ id: String(question.id), value: toDisplay(question, canAssign) }));

      return { key: sectionKey(when, frequency), nodes: buildNodes(leaves, display => display.mainPlanQuestion.order, newClusterId) };
    }),
  );
}

export function buildWhenSections(state: MpqSectionState[]): MpqWhenSection[] {
  let orderOffset = 0;
  let groupOffset = 0;

  return WHEN_ORDER.map(when => ({
    frequencies: FREQUENCY_ORDER.map(frequency => {
      const key = sectionKey(when, frequency);
      const nodes = state.find(section => section.key === key)?.nodes ?? [];
      const items = buildNodeViews(nodes, display => display.editable, orderOffset, groupOffset);

      orderOffset += nodes.filter(node => node.type === 'leaf' || node.cluster.leaves.length > 0).length;
      groupOffset += nodes.filter(node => node.type === 'cluster').length;

      return { frequency, items, key };
    }),
    when,
  }));
}

export function toDisplay(mainPlanQuestion: MainPlanQuestion, canAssign: boolean): MpqDisplay {
  const bookingQuestion = mainPlanQuestion.bookingQuestion;

  return {
    choiceLabels: bookingQuestion.choices?.length ? bookingQuestion.choices.map(choice => choice.label) : null,
    description: bookingQuestion.description,
    editable: canAssign && bookingQuestion.allowedCapabilities.canAssign,
    mainPlanQuestion,
    title: bookingQuestion.title,
    viewable: bookingQuestion.allowedCapabilities.canViewDetails,
  };
}
