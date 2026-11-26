import type { Params } from '@angular/router';

export type IgntBreadcrumbRouterItem = Readonly<{
  label: string;
  routerLink: string | readonly string[];
  type: 'router';
  fragment?: string;
  queryParams?: Params;
}>;

export type IgntBreadcrumbActionItem = Readonly<{
  id: string;
  label: string;
  type: 'action';
}>;

export type IgntBreadcrumbLabelItem = Readonly<{
  label: string;
  type: 'label';
}>;

export type IgntBreadcrumbItem = IgntBreadcrumbRouterItem | IgntBreadcrumbActionItem | IgntBreadcrumbLabelItem;
