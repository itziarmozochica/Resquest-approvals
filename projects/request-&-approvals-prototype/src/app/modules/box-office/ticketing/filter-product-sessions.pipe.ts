import { Pipe, PipeTransform } from '@angular/core';

import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';

@Pipe({
  name: 'filterProductSessions',
  standalone: true,
})
export class FilterProductSessionsPipe implements PipeTransform {
  transform(ticketTypes: Map<string, number>, productSessions: SessionAvailability[]): Map<string, number> {
    const ticketTypesWithoutProducts: Map<string, number> = new Map();
    ticketTypes.forEach((ticketTypeNumber, ticketTypeName) => {
      const existingTicketType = productSessions?.find(({ name: productSessionName }) => productSessionName === ticketTypeName);
      if (!existingTicketType) {
        ticketTypesWithoutProducts.set(ticketTypeName, ticketTypeNumber);
      }
    });
    return ticketTypesWithoutProducts;
  }
}
