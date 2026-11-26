import {
  mapCustomFieldDto,
  mapCustomFieldToDto,
  mapLayoutDto,
  mapLayoutToDto,
  ServiceCatalogCustomField,
  ServiceCatalogCustomFieldApiDto,
  TemplateLayout,
  TemplateLayoutApiDto,
} from '@fz-original/app/modules/admin-project-management-settings/models/service-catalog.model';

export interface StepperTemplateSummary {
  key: string;
  label: string;
  multiInstance: boolean;
}

export interface StepperTemplateSummaryApiDto {
  key: string;
  label: string;
  multi_instance?: boolean;
}

export interface StepperTemplate extends StepperTemplateSummary {
  layout: TemplateLayout;
  customFields: ServiceCatalogCustomField[];
}

export interface StepperTemplateApiDto extends StepperTemplateSummaryApiDto {
  layout?: TemplateLayoutApiDto;
  custom_fields?: ServiceCatalogCustomFieldApiDto[];
}

export interface StepperInstanceAnswer {
  instanceId: string;
  answers: Record<string, unknown>;
}

export type StepperRefAnswerValue = StepperInstanceAnswer | StepperInstanceAnswer[];

export function mapStepperTemplateSummaryDto(dto: StepperTemplateSummaryApiDto): StepperTemplateSummary {
  return {
    key: dto.key,
    label: dto.label,
    multiInstance: dto.multi_instance ?? false,
  };
}

export function mapStepperTemplateSummaryToDto(value: StepperTemplateSummary): StepperTemplateSummaryApiDto {
  return {
    key: value.key,
    label: value.label,
    multi_instance: value.multiInstance,
  };
}

export function mapStepperTemplateDto(dto: StepperTemplateApiDto): StepperTemplate {
  return {
    ...mapStepperTemplateSummaryDto(dto),
    layout: mapLayoutDto(dto.layout ?? { version: 1, sections: [] }),
    customFields: (dto.custom_fields ?? []).map(mapCustomFieldDto),
  };
}

export function mapStepperTemplateToDto(value: StepperTemplate): StepperTemplateApiDto {
  return {
    ...mapStepperTemplateSummaryToDto(value),
    layout: mapLayoutToDto(value.layout),
    custom_fields: value.customFields.map(mapCustomFieldToDto),
  };
}
