import { SelectOption } from '../select/select.interface';

export class TypeaheadEvent {
  constructor(
    public selectedOption: SelectOption | string,
    public event: any,
  ) {}
}
