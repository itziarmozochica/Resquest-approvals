import type { RetailSetupType } from '../../../core/models/retail-setup-type.model';

const RUNBOOK_DOC_URL = 'https://docs.google.com/document/d/1r4nlMv5QILRYPTAVJ4BBu2AmLULcnEQ0GevnEfN7Fpo/edit';

const RUNBOOK_TABS: Partial<Record<RetailSetupType, string>> = {
  odoo: `${RUNBOOK_DOC_URL}?tab=t.qlp8q6gii85s`,
  square: `${RUNBOOK_DOC_URL}?tab=t.0`,
};

export function getNoActiveSessionRunbookUrl(catalogIntegrationType: string | undefined): string {
  if (catalogIntegrationType === undefined) {
    return RUNBOOK_DOC_URL;
  }

  return RUNBOOK_TABS[catalogIntegrationType as RetailSetupType] ?? RUNBOOK_DOC_URL;
}
