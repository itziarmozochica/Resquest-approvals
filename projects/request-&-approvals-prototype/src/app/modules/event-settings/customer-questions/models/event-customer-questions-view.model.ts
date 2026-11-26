import { GroupNodeView } from '@fz-original/app/shared/grouping/group-node.model';
import { MainPlanQuestion } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question.model';
import { QuestionFrequency } from '@fz-original/app/shared/main-plan-questions/models/question-frequency.enum';
import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';

export interface MpqDisplay {
  choiceLabels: string[] | null;
  description: string;
  editable: boolean;
  mainPlanQuestion: MainPlanQuestion;
  title: string;
  viewable: boolean;
}

export interface MpqFrequencySection {
  frequency: QuestionFrequency;
  items: GroupNodeView<MpqDisplay>[];
  key: string;
}

export interface MpqWhenSection {
  frequencies: MpqFrequencySection[];
  when: QuestionWhen;
}
