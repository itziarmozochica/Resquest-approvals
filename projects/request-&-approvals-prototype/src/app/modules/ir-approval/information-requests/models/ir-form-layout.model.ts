/** Partner-facing form layout. Mirrors the admin `TemplateLayout` shape; kept local to the IR module to avoid a runtime import cycle. */
export interface IrFormLayoutRow {
  columns: string[][];
}

export interface IrFormLayoutSection {
  title: string;
  rows: IrFormLayoutRow[];
}

export interface IrFormLayout {
  version: number;
  sections: IrFormLayoutSection[];
  eventScheduleCapture?: 'composer' | 'custom' | null;
}

export interface IrFormLayoutRowApiDto {
  columns?: string[][];
  field_ids?: string[];
}

export interface IrFormLayoutSectionApiDto {
  title?: string;
  rows?: IrFormLayoutRowApiDto[];
}

export interface IrFormLayoutApiDto {
  version?: number;
  sections?: IrFormLayoutSectionApiDto[];
  event_schedule_capture?: 'composer' | 'custom' | null;
}

export function mapIrFormLayoutDto(dto: IrFormLayoutApiDto): IrFormLayout {
  const layout: IrFormLayout = {
    version: dto.version ?? 1,
    sections: (dto.sections ?? []).map(section => ({
      title: section.title ?? 'General',
      rows: (section.rows ?? []).map(row => ({ columns: row.columns ?? (row.field_ids ? [row.field_ids] : []) })),
    })),
  };
  if (dto.event_schedule_capture != null) {
    layout.eventScheduleCapture = dto.event_schedule_capture;
  }
  return layout;
}
