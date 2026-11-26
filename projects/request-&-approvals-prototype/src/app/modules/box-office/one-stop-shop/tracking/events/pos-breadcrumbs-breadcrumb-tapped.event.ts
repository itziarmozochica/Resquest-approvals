import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosBreadcrumbType = 'category' | 'home';

export interface PosBreadcrumbsBreadcrumbTappedData {
  breadcrumbType: PosBreadcrumbType;
  category: string | null;
}

export const posBreadcrumbsBreadcrumbTapped = defineEvent<PosBreadcrumbsBreadcrumbTappedData>('pos.breadcrumbs.breadcrumb.tapped');
