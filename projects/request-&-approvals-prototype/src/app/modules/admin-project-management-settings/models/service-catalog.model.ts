import {
  InformationRequestFileKind,
  InformationRequestQuestionType,
  parseInformationRequestQuestionType,
  questionTypeToBackendToken,
} from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-question.model';

export type CatalogFieldKind = 'simple' | 'faq' | 'grid' | 'venue' | 'stepperRef';

export interface CatalogGridColumnSpec {
  id: string;
  label: string;
  type: string;
  helpText?: string | null;
  defaultRequired?: boolean | null;
  requiredLocked?: boolean | null;
  placement?: 'row' | 'table_header' | null;
}

export interface TicketTableHeaderFieldSpec {
  id: string;
  label: string;
  type: string;
  helpText?: string | null;
  required?: boolean | null;
  options?: string[] | null;
  picklistOptionHelpers?: string[] | null;
}

export interface TemplateQuestionOverride {
  label?: string | null;
  required?: boolean | null;
  enabled?: boolean | null;
  helpText?: string | null;
  options?: string[] | null;
  section?: string | null;
  order?: number | null;
  requiredLocked?: boolean | null;
  removalLocked?: boolean | null;
  inputType?: string | null;
  tableColumnTypes?: Record<string, string> | null;
  tableColumnPicklists?: Record<string, string[]> | null;
  tableColumnLabels?: Record<string, string> | null;
  tableColumnHelpText?: Record<string, string> | null;
  ticketTableHeaderFields?: TicketTableHeaderFieldSpec[] | null;
  picklistOptionHelpers?: string[] | null;
  picklistOptionAskDetail?: boolean[] | null;
  textareaMinRows?: number | null;
  faqMinPairs?: number | null;
}

export interface TemplateQuestionOverrideApiDto {
  label_override?: string | null;
  default_required?: boolean | null;
  partner_hidden?: boolean | null;
  help_text?: string | null;
  picklist_options?: string[] | null;
  section_override?: string | null;
  order?: number | null;
  required_locked?: boolean | null;
  removal_locked?: boolean | null;
  input_type?: string | null;
  table_column_types?: Record<string, string> | null;
  table_column_picklists?: Record<string, string[]> | null;
  table_column_labels?: Record<string, string> | null;
  table_column_help_text?: Record<string, string> | null;
  ticket_table_header_fields?: TicketTableHeaderFieldSpec[] | null;
  picklist_option_helpers?: string[] | null;
  picklist_option_ask_detail?: boolean[] | null;
  textarea_min_rows?: number | null;
  faq_min_pairs?: number | null;
}

export interface ServiceCatalogCustomField {
  id: string;
  label: string;
  type: InformationRequestQuestionType;
  section: string;
  order: number;
  required?: boolean;
  helpText?: string | null;
  options?: string[] | null;
  removalLocked?: boolean;
  kind?: CatalogFieldKind | null;
  gridColumns?: CatalogGridColumnSpec[] | null;
  gridMinRows?: number | null;
  fileRuleKind?: string | null;
  fileAccept?: string[] | null;
  acceptedFileKinds?: InformationRequestFileKind[] | null;
  tableColumnTypes?: Record<string, string> | null;
  tableColumnPicklists?: Record<string, string[]> | null;
  tableColumnLabels?: Record<string, string> | null;
  tableColumnHelpText?: Record<string, string> | null;
  ticketTableHeaderFields?: TicketTableHeaderFieldSpec[] | null;
  picklistOptionHelpers?: string[] | null;
  picklistOptionAskDetail?: boolean[] | null;
  textareaMinRows?: number | null;
  faqMinPairs?: number | null;
  stepperTemplateKey?: string | null;
  multiInstance?: boolean | null;
  /** Opt a CATALOG_GRID field into a richer editor (e.g. 'event_schedule' calendar composer). */
  gridComposer?: string | null;
  /** Field id whose answer supplies the composer's product list (e.g. the ticket-types field). */
  productSourceFieldId?: string | null;
  /** Column in the product-source rows holding the product name (defaults to 'ticketType'). */
  productNameColumn?: string | null;
  venueSourceFieldId?: string | null;
}

export interface ServiceCatalogCustomFieldApiDto {
  id: string;
  label: string;
  type?: string;
  input_type?: string;
  section: string;
  order: number;
  required?: boolean;
  help_text?: string | null;
  options?: string[] | null;
  removal_locked?: boolean;
  kind?: CatalogFieldKind | null;
  grid_columns?: CatalogGridColumnSpec[] | null;
  grid_min_rows?: number | null;
  file_rule_kind?: string | null;
  file_accept?: string[] | null;
  table_column_types?: Record<string, string> | null;
  table_column_picklists?: Record<string, string[]> | null;
  table_column_labels?: Record<string, string> | null;
  table_column_help_text?: Record<string, string> | null;
  ticket_table_header_fields?: TicketTableHeaderFieldSpec[] | null;
  picklist_option_helpers?: string[] | null;
  picklist_option_ask_detail?: boolean[] | null;
  textarea_min_rows?: number | null;
  faq_min_pairs?: number | null;
  stepper_template_key?: string | null;
  multi_instance?: boolean | null;
  grid_composer?: string | null;
  product_source_field_id?: string | null;
  product_name_column?: string | null;
  venue_source_field_id?: string | null;
}

export interface TemplateLayoutRow {
  columns: string[][];
}

export interface TemplateLayoutSection {
  title: string;
  rows: TemplateLayoutRow[];
}

export interface TemplateLayout {
  version: number;
  sections: TemplateLayoutSection[];
  // TODO(post-FE-22): deprecate once BE drops it — replaced by STEPPER_REF + stepper template catalog
  eventScheduleCapture?: 'composer' | 'custom' | null;
}

export interface TemplateLayoutRowApiDto {
  columns?: string[][];
  field_ids?: string[];
}

export interface TemplateLayoutSectionApiDto {
  title: string;
  rows: TemplateLayoutRowApiDto[];
}

export interface TemplateLayoutApiDto {
  version: number;
  sections: TemplateLayoutSectionApiDto[];
  event_schedule_capture?: 'composer' | 'custom' | null;
}

export const CATALOG_META_KEY = '__meta__';

export interface CatalogMetaApiDto {
  hidden_template_keys?: string[];
  globally_ordered_templates?: boolean;
}

export interface CatalogMeta {
  hiddenTemplateKeys: string[];
  globallyOrdered: boolean;
}

export type OverridesByTemplate = Record<string, Record<string, TemplateQuestionOverride>>;
export type CustomFieldsByTemplate = Record<string, ServiceCatalogCustomField[]>;
export type LayoutsByTemplate = Record<string, TemplateLayout>;

export type OverridesByTemplateApiDto = Record<string, Record<string, TemplateQuestionOverrideApiDto>>;
export type CustomFieldsByTemplateApiDto = Record<string, ServiceCatalogCustomFieldApiDto[]>;
export type LayoutsByTemplateApiDto = Record<string, TemplateLayoutApiDto>;

export interface ServiceCatalogSettings {
  id: string;
  overrides: OverridesByTemplate;
  customFields: CustomFieldsByTemplate;
  layouts: LayoutsByTemplate;
  hiddenTemplateKeys: string[];
  globallyOrdered: boolean;
  updatedAt: string | null;
}

export interface ServiceCatalogSettingsApiDto {
  id: string;
  overrides: OverridesByTemplateApiDto;
  custom_fields: CustomFieldsByTemplateApiDto;
  layouts: LayoutsByTemplateApiDto;
  updated_at: string | null;
}

export interface TemplateQuestion {
  id: string;
  label: string;
  type: InformationRequestQuestionType;
  required: boolean;
  enabled: boolean;
  section: string | null;
  helpText: string | null;
  options: string[];
  requiredLocked: boolean;
  removalLocked: boolean;
}

export interface TemplateQuestionApiDto {
  id: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  section?: string | null;
  help_text?: string | null;
  options?: string[];
  required_locked?: boolean;
  removal_locked?: boolean;
}

export interface MergedTemplate {
  templateKey: string;
  questions: TemplateQuestion[];
}

export interface MergedTemplateApiDto {
  template_key: string;
  questions: TemplateQuestionApiDto[];
}

export function mapOverrideDto(dto: TemplateQuestionOverrideApiDto): TemplateQuestionOverride {
  const out: TemplateQuestionOverride = {
    label: dto.label_override ?? null,
    required: dto.default_required ?? null,
    enabled: dto.partner_hidden == null ? null : !dto.partner_hidden,
    helpText: dto.help_text ?? null,
    options: dto.picklist_options ?? null,
    section: dto.section_override ?? null,
    order: dto.order ?? null,
    requiredLocked: dto.required_locked ?? null,
    removalLocked: dto.removal_locked ?? null,
  };
  if (dto.input_type != null) out.inputType = dto.input_type;
  if (dto.table_column_types != null) out.tableColumnTypes = dto.table_column_types;
  if (dto.table_column_picklists != null) out.tableColumnPicklists = dto.table_column_picklists;
  if (dto.table_column_labels != null) out.tableColumnLabels = dto.table_column_labels;
  if (dto.table_column_help_text != null) out.tableColumnHelpText = dto.table_column_help_text;
  if (dto.ticket_table_header_fields != null) out.ticketTableHeaderFields = dto.ticket_table_header_fields;
  if (dto.picklist_option_helpers != null) out.picklistOptionHelpers = dto.picklist_option_helpers;
  if (dto.picklist_option_ask_detail != null) out.picklistOptionAskDetail = dto.picklist_option_ask_detail;
  if (dto.textarea_min_rows != null) out.textareaMinRows = dto.textarea_min_rows;
  if (dto.faq_min_pairs != null) out.faqMinPairs = dto.faq_min_pairs;
  return out;
}

export function mapOverrideToDto(value: TemplateQuestionOverride): TemplateQuestionOverrideApiDto {
  const dto: TemplateQuestionOverrideApiDto = {};
  if (value.label != null) dto.label_override = value.label;
  if (value.required != null) dto.default_required = value.required;
  if (value.enabled != null) dto.partner_hidden = !value.enabled;
  if (value.helpText != null) dto.help_text = value.helpText;
  if (value.options != null) dto.picklist_options = value.options;
  if (value.section != null) dto.section_override = value.section;
  if (value.order != null) dto.order = value.order;
  if (value.requiredLocked != null) dto.required_locked = value.requiredLocked;
  if (value.removalLocked != null) dto.removal_locked = value.removalLocked;
  if (value.inputType != null) dto.input_type = value.inputType;
  if (value.tableColumnTypes != null) dto.table_column_types = value.tableColumnTypes;
  if (value.tableColumnPicklists != null) dto.table_column_picklists = value.tableColumnPicklists;
  if (value.tableColumnLabels != null) dto.table_column_labels = value.tableColumnLabels;
  if (value.tableColumnHelpText != null) dto.table_column_help_text = value.tableColumnHelpText;
  if (value.ticketTableHeaderFields != null) dto.ticket_table_header_fields = value.ticketTableHeaderFields;
  if (value.picklistOptionHelpers != null) dto.picklist_option_helpers = value.picklistOptionHelpers;
  if (value.picklistOptionAskDetail != null) dto.picklist_option_ask_detail = value.picklistOptionAskDetail;
  if (value.textareaMinRows != null) dto.textarea_min_rows = value.textareaMinRows;
  if (value.faqMinPairs != null) dto.faq_min_pairs = value.faqMinPairs;
  return dto;
}

export function mapCustomFieldDto(dto: ServiceCatalogCustomFieldApiDto): ServiceCatalogCustomField {
  const field: ServiceCatalogCustomField = {
    id: dto.id,
    label: dto.label,
    type: parseInformationRequestQuestionType(dto.input_type ?? dto.type ?? ''),
    section: dto.section,
    order: dto.order,
    required: dto.required ?? false,
    helpText: dto.help_text ?? null,
    options: dto.options ?? null,
    removalLocked: dto.removal_locked ?? false,
  };
  if (dto.kind != null) field.kind = dto.kind;
  if (dto.grid_columns != null) field.gridColumns = dto.grid_columns;
  if (dto.grid_min_rows != null) field.gridMinRows = dto.grid_min_rows;
  if (dto.file_rule_kind != null) field.fileRuleKind = dto.file_rule_kind;
  if (dto.file_accept != null) field.fileAccept = dto.file_accept;
  if (dto.table_column_types != null) field.tableColumnTypes = dto.table_column_types;
  if (dto.table_column_picklists != null) field.tableColumnPicklists = dto.table_column_picklists;
  if (dto.table_column_labels != null) field.tableColumnLabels = dto.table_column_labels;
  if (dto.table_column_help_text != null) field.tableColumnHelpText = dto.table_column_help_text;
  if (dto.ticket_table_header_fields != null) field.ticketTableHeaderFields = dto.ticket_table_header_fields;
  if (dto.picklist_option_helpers != null) field.picklistOptionHelpers = dto.picklist_option_helpers;
  if (dto.picklist_option_ask_detail != null) field.picklistOptionAskDetail = dto.picklist_option_ask_detail;
  if (dto.textarea_min_rows != null) field.textareaMinRows = dto.textarea_min_rows;
  if (dto.faq_min_pairs != null) field.faqMinPairs = dto.faq_min_pairs;
  if (dto.stepper_template_key != null) field.stepperTemplateKey = dto.stepper_template_key;
  if (dto.multi_instance != null) field.multiInstance = dto.multi_instance;
  if (dto.grid_composer != null) field.gridComposer = dto.grid_composer;
  if (dto.product_source_field_id != null) field.productSourceFieldId = dto.product_source_field_id;
  if (dto.product_name_column != null) field.productNameColumn = dto.product_name_column;
  if (dto.venue_source_field_id != null) field.venueSourceFieldId = dto.venue_source_field_id;
  return field;
}

export function mapCustomFieldToDto(field: ServiceCatalogCustomField): ServiceCatalogCustomFieldApiDto {
  const dto: ServiceCatalogCustomFieldApiDto = {
    id: field.id,
    label: field.label,
    input_type: questionTypeToBackendToken(field.type),
    section: field.section,
    order: field.order,
  };
  if (field.required != null) dto.required = field.required;
  if (field.helpText != null) dto.help_text = field.helpText;
  if (field.options != null) dto.options = field.options;
  if (field.removalLocked) dto.removal_locked = true;
  if (field.kind != null) dto.kind = field.kind;
  if (field.gridColumns != null) dto.grid_columns = field.gridColumns;
  if (field.gridMinRows != null) dto.grid_min_rows = field.gridMinRows;
  if (field.fileRuleKind != null) dto.file_rule_kind = field.fileRuleKind;
  if (field.fileAccept != null) dto.file_accept = field.fileAccept;
  if (field.tableColumnTypes != null) dto.table_column_types = field.tableColumnTypes;
  if (field.tableColumnPicklists != null) dto.table_column_picklists = field.tableColumnPicklists;
  if (field.tableColumnLabels != null) dto.table_column_labels = field.tableColumnLabels;
  if (field.tableColumnHelpText != null) dto.table_column_help_text = field.tableColumnHelpText;
  if (field.ticketTableHeaderFields != null) dto.ticket_table_header_fields = field.ticketTableHeaderFields;
  if (field.picklistOptionHelpers != null) dto.picklist_option_helpers = field.picklistOptionHelpers;
  if (field.picklistOptionAskDetail != null) dto.picklist_option_ask_detail = field.picklistOptionAskDetail;
  if (field.textareaMinRows != null) dto.textarea_min_rows = field.textareaMinRows;
  if (field.faqMinPairs != null) dto.faq_min_pairs = field.faqMinPairs;
  if (field.stepperTemplateKey != null) dto.stepper_template_key = field.stepperTemplateKey;
  if (field.multiInstance != null) dto.multi_instance = field.multiInstance;
  if (field.gridComposer != null) dto.grid_composer = field.gridComposer;
  if (field.productSourceFieldId != null) dto.product_source_field_id = field.productSourceFieldId;
  if (field.productNameColumn != null) dto.product_name_column = field.productNameColumn;
  if (field.venueSourceFieldId != null) dto.venue_source_field_id = field.venueSourceFieldId;
  return dto;
}

export function mapLayoutDto(dto: TemplateLayoutApiDto): TemplateLayout {
  const layout: TemplateLayout = {
    version: dto.version ?? 1,
    sections: (dto.sections ?? []).map(s => ({
      title: s.title,
      rows: (s.rows ?? []).map(r => ({ columns: r.columns ?? (r.field_ids ? [r.field_ids] : []) })),
    })),
  };
  if (dto.event_schedule_capture != null) layout.eventScheduleCapture = dto.event_schedule_capture;
  return layout;
}

export function mapLayoutToDto(value: TemplateLayout): TemplateLayoutApiDto {
  const dto: TemplateLayoutApiDto = {
    version: value.version,
    sections: value.sections.map(s => ({
      title: s.title,
      rows: s.rows.map(r => ({ columns: r.columns })),
    })),
  };
  if (value.eventScheduleCapture != null) dto.event_schedule_capture = value.eventScheduleCapture;
  return dto;
}

export function mapServiceCatalogSettingsDto(dto: ServiceCatalogSettingsApiDto): ServiceCatalogSettings {
  const overrides: OverridesByTemplate = {};
  for (const [tk, byField] of Object.entries(dto.overrides ?? {})) {
    overrides[tk] = {};
    for (const [fid, ov] of Object.entries(byField ?? {})) {
      overrides[tk][fid] = mapOverrideDto(ov);
    }
  }
  const customFields: CustomFieldsByTemplate = {};
  for (const [tk, arr] of Object.entries(dto.custom_fields ?? {})) {
    customFields[tk] = (arr ?? []).map(mapCustomFieldDto);
  }
  const layouts: LayoutsByTemplate = {};
  let hiddenTemplateKeys: string[] = [];
  let globallyOrdered = false;
  for (const [tk, layout] of Object.entries(dto.layouts ?? {})) {
    if (tk === CATALOG_META_KEY) {
      const meta = layout as unknown as CatalogMetaApiDto;
      hiddenTemplateKeys = meta?.hidden_template_keys ?? [];
      globallyOrdered = meta?.globally_ordered_templates ?? false;
      continue;
    }
    layouts[tk] = mapLayoutDto(layout);
  }
  return {
    id: dto.id,
    overrides,
    customFields,
    layouts,
    hiddenTemplateKeys,
    globallyOrdered,
    updatedAt: dto.updated_at ?? null,
  };
}

export function mapTemplateQuestionDto(dto: TemplateQuestionApiDto): TemplateQuestion {
  return {
    id: dto.id,
    label: dto.label,
    type: parseInformationRequestQuestionType(dto.type),
    required: dto.required ?? false,
    enabled: dto.enabled ?? true,
    section: dto.section ?? null,
    helpText: dto.help_text ?? null,
    options: dto.options ?? [],
    requiredLocked: dto.required_locked ?? false,
    removalLocked: dto.removal_locked ?? false,
  };
}

export function mapMergedTemplateDto(dto: MergedTemplateApiDto): MergedTemplate {
  return {
    templateKey: dto.template_key,
    questions: (dto.questions ?? []).map(mapTemplateQuestionDto),
  };
}
