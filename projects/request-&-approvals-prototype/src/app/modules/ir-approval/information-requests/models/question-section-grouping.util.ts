import { InformationRequestQuestion } from './information-request-question.model';

export interface QuestionSectionGroup {
  questions: InformationRequestQuestion[];
  section: string | null;
}

export function groupBySection(questions: InformationRequestQuestion[]): QuestionSectionGroup[] {
  const order: (string | null)[] = [];
  const bySection = new Map<string | null, InformationRequestQuestion[]>();
  for (const question of questions) {
    const key = question.section ?? null;
    if (!bySection.has(key)) {
      bySection.set(key, []);
      order.push(key);
    }
    bySection.get(key)!.push(question);
  }
  return order.map(section => ({ questions: bySection.get(section)!, section }));
}
