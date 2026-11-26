import { SelectOption } from '../../../layout/filters/select/select.interface';

export interface TableHeader {
  label: string;
  columnSize?: string;
  hasBorderLeft: boolean;
  alignment: string;
  orderBy?: string;
  filterBy?: string;
  filterByOptions?: Array<SelectOption>;
  filterBySelected?: SelectOption;
  paddingLeft?: string;
  tooltip?: string;
}
