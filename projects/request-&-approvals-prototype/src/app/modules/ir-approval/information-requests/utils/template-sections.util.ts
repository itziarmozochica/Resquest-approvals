import { InformationRequestTemplateSummary } from '../models/information-request-template.model';
import { InformationRequest } from '../models/information-request.model';
import { backfillQuestionSections } from '../models/template-section-backfill';

export interface TemplateSectionsResult {
  request: InformationRequest;
  template: InformationRequestTemplateSummary | null;
}

export function templateKeyToBackfill(request: InformationRequest | null): string | null {
  if (!request?.templateKey || request.layout || !(request.questions ?? []).some(question => question.section == null)) {
    return null;
  }
  return request.templateKey;
}

export function withTemplateSections(
  request: InformationRequest,
  templateKey: string,
  templates: InformationRequestTemplateSummary[] | null,
): TemplateSectionsResult {
  const template = templates?.find(summary => summary.key === templateKey) ?? null;
  return { request: template ? backfillQuestionSections(request, template) : request, template };
}
