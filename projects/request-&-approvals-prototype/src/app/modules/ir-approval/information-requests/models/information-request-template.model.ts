import {
  InformationRequestQuestion,
  InformationRequestQuestionApiDto,
  mapInformationRequestQuestionDto,
} from './information-request-question.model';

export interface InformationRequestTemplateSummary {
  key: string;
  label: string;
  group?: string | null;
  questions: InformationRequestQuestion[];
}

export interface InformationRequestTemplateSummaryApiDto {
  key: string;
  label: string;
  group?: string | null;
  questions?: InformationRequestQuestionApiDto[];
}

export interface ListInformationRequestTemplatesApiData {
  templates: InformationRequestTemplateSummaryApiDto[];
}

export function mapInformationRequestTemplateSummaryDto(dto: InformationRequestTemplateSummaryApiDto): InformationRequestTemplateSummary {
  return {
    key: dto.key,
    label: dto.label,
    group: dto.group ?? null,
    questions: (dto.questions ?? []).map(mapInformationRequestQuestionDto),
  };
}
