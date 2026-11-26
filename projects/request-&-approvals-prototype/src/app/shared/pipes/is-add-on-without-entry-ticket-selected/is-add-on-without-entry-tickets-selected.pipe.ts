import { Pipe, PipeTransform } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { TicketType } from '../../models/ticket-type/ticket-type.model';

@Pipe({
  name: 'isAddonWithoutEntryTicketsSelected',
  standalone: true,
})
export class IsAddonWithoutEntryTicketsSelectedPipe implements PipeTransform {
  transform(ticketType: TicketType, formGroup: UntypedFormGroup, ticketTypes: TicketType[]): boolean {
    const control = formGroup.get(ticketType.sessionId?.toString() ?? '');

    if (!ticketType.isAddon || !control?.value || Number.parseInt(control?.value) < 0) {
      return false;
    }

    const entryTicketTypes = ticketTypes.filter(ticketType => !ticketType.isAddon);
    const entryTicketTypesValues = entryTicketTypes.map(ticketType => formGroup.get(ticketType.sessionId?.toString() ?? '')?.value);

    return !entryTicketTypesValues.some(value => Number.parseInt(value) > 0);
  }
}
