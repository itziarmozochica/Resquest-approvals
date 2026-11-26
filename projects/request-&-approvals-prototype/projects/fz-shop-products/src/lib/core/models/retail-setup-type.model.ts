export const retailOptions = ['shopify', 'square', 'odoo', 'onebox'] as const;

export type RetailSetupType = (typeof retailOptions)[number];
