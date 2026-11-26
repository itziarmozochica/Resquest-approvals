import { QuickSetupInventoryItemForm } from '../../../../../models/quick-setup-inventory.model';

type TicketsAllowedForm = Pick<QuickSetupInventoryItemForm, 'errors'> & {
  controls: Pick<QuickSetupInventoryItemForm['controls'], 'maxToSell' | 'minToSell'>;
};

export function ticketsAllowedErrorKeyFor(row: TicketsAllowedForm): string | null {
  const { maxToSell, minToSell } = row.controls;

  if (!(minToSell.touched || minToSell.dirty || maxToSell.touched || maxToSell.dirty)) {
    return null;
  }

  if (row.errors?.['ticketsAllowedIncomplete'] === true) {
    return 'form.error.eitherOneOrNoneFilled';
  }

  return row.errors?.['ticketsAllowedRange'] === true ? 'form.error.lessOrEqual' : null;
}
