import { InformationRequestTemplateSummary } from './information-request-template.model';
import { InformationRequest } from './information-request.model';

/**
 * Re-attach each question's `section` from its originating template, matched by question id.
 *
 * Information requests are materialised from a template, but the backend currently drops the
 * per-question `section`, so saved requests render flat. The request keeps its `templateKey`
 * and the template summary still carries the sections keyed by the same question ids, letting
 * the fill view reconstruct the section grouping. Only questions whose section is missing are
 * patched; anything already sectioned (or absent from the template) is left untouched.
 */
export function backfillQuestionSections(request: InformationRequest, template: InformationRequestTemplateSummary): InformationRequest {
  if (!request.questions?.length) {
    return request;
  }
  const sectionById = new Map(template.questions.map(question => [question.id, question.section ?? null]));
  const questions = request.questions.map(question => {
    const templateSection = sectionById.get(question.id);
    return question.section == null && templateSection != null ? { ...question, section: templateSection } : question;
  });
  return { ...request, questions };
}
