import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IgntIconName, IgntIconVariant } from '@ignite/icon';

export enum ExportTypeEnum {
  CSV = 'text/csv',
  JSON = 'application/json',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PDF = 'application/pdf',
}

export class ExportOption {
  constructor(
    public label: string,
    public icon: IconProp,
    public fileType: ExportTypeEnum,
    public extension: string,
    public menuIcon: { name: IgntIconName; variant: IgntIconVariant },
  ) {}
}

export const commonExportOptionsList = {
  PDF: new ExportOption('PDF', ['fal', 'file-pdf'], ExportTypeEnum.PDF, 'pdf', { name: 'file-pdf', variant: 'light' }),
  CSV: new ExportOption('CSV', ['fal', 'file-csv'], ExportTypeEnum.CSV, 'csv', { name: 'file-csv', variant: 'light' }),
  XLSX: new ExportOption('XLSX', ['fal', 'file-excel'], ExportTypeEnum.XLSX, 'xlsx', { name: 'file-excel', variant: 'light' }),
};
