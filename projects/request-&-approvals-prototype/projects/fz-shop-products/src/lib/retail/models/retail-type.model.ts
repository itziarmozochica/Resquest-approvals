import { retailOptions, type RetailSetupType } from '../../core/models/retail-setup-type.model';

export interface RetailSelectOptionConfig {
  description: string;
  iconSrc: string;
  title: string;
  type: RetailSetupType;
}

export const retailTypeIcons: Record<RetailSetupType, string> = {
  odoo: 'assets/images/catalog-integration/odoo.svg',
  onebox: 'assets/images/catalog-integration/onebox.svg',
  shopify: 'assets/images/catalog-integration/shopify.svg',
  square: 'assets/images/catalog-integration/square.svg',
};

export const retailTypeLabels: Record<RetailSetupType, string> = {
  odoo: 'retailSetup.retailType.odoo.title',
  onebox: 'retailSetup.retailType.onebox.title',
  shopify: 'retailSetup.retailType.shopify.title',
  square: 'retailSetup.retailType.square.title',
};

const retailTypeDescriptions: Record<RetailSetupType, string> = {
  odoo: 'retailSetup.retailType.odoo.description',
  onebox: 'retailSetup.retailType.onebox.description',
  shopify: 'retailSetup.retailType.shopify.description',
  square: 'retailSetup.retailType.square.description',
};

export const retailSelectOptions: readonly RetailSelectOptionConfig[] = retailOptions.map(type => ({
  description: retailTypeDescriptions[type],
  iconSrc: retailTypeIcons[type],
  title: retailTypeLabels[type],
  type,
}));

export const retailGuideUrls: Readonly<Record<RetailSetupType, string | null>> = {
  odoo: 'https://docs.google.com/document/d/1FmtPVAW_D7LjLjEK7isBPzwpOVpeA-cicI1QfPNVW6w',
  onebox: null,
  shopify: 'https://docs.google.com/document/d/1pKQI0nmOe4A7_9thuHrrBmC48p-6rFrY9lZTlBwVs54',
  square: 'https://docs.google.com/document/d/1DOS_SOXjx6hVScN4JAtfuX2MPAljb-AhFd4GSPT--Cc',
};
