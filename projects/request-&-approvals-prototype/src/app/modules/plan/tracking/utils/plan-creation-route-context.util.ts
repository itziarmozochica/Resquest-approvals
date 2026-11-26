import { PRIMARY_OUTLET, UrlTree } from '@angular/router';

export function getPrimaryPathSegments(urlTree: UrlTree): string[] {
  return urlTree.root.children[PRIMARY_OUTLET]?.segments.map(segment => segment.path) ?? [];
}

export function isDashboardUrlTree(urlTree: UrlTree): boolean {
  const segments = getPrimaryPathSegments(urlTree);

  return segments[0] === 'plans' && segments[1] === 'dashboard';
}

export function isInventoryUrlTree(urlTree: UrlTree): boolean {
  return getPrimaryPathSegments(urlTree)[0] === 'inventory';
}

function readPositivePlanId(rawValue: string | undefined | null): number | null {
  const planId = Number(rawValue ?? '');

  return Number.isFinite(planId) && planId > 0 ? planId : null;
}

export function readPlanIdFromDashboardUrl(urlTree: UrlTree): number | null {
  const segments = getPrimaryPathSegments(urlTree);
  const routePlanId = segments[2] ? readPositivePlanId(segments[2]) : null;

  if (routePlanId !== null) {
    return routePlanId;
  }

  return readPositivePlanId(urlTree.queryParams['planId']);
}

export function readPlanIdFromUrlQueryParams(urlTree: UrlTree): number | null {
  return readPositivePlanId(urlTree.queryParams['planId']);
}

export function isDashboardUrlForPlan(urlTree: UrlTree, planId: number): boolean {
  if (!isDashboardUrlTree(urlTree)) {
    return false;
  }

  return readPlanIdFromDashboardUrl(urlTree) === planId;
}

export function isInventoryUrlForPlan(urlTree: UrlTree, planId: number): boolean {
  if (!isInventoryUrlTree(urlTree)) {
    return false;
  }

  const targetPlanId = readPlanIdFromUrlQueryParams(urlTree);

  return targetPlanId === planId;
}
