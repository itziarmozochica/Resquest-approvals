import { HttpParams } from '@angular/common/http';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

import { SessionTypeCategoryApiParams, SessionTypeCategoryFilter } from '../models/session-type-category-filter.enum';

export function getSessionTypeCategoryFilterOptions(translate: (key: string) => string): SelectOption[] {
  return [
    {
      id: SessionTypeCategoryFilter.TICKETS_AND_ADD_ONS,
      title: translate('sessions.pricing.priceListsOverview.sessionTypeCategoryFilterOptions.ticketsAndAddOns'),
    },
    {
      id: SessionTypeCategoryFilter.SHOP_PRODUCT,
      title: translate('sessions.pricing.priceListsOverview.sessionTypeCategoryFilterOptions.shopProduct'),
    },
  ];
}

export function getSelectedSessionTypeCategoryOptions(
  options: SelectOption[],
  selectedCategories: SessionTypeCategoryFilter[],
): SelectOption[] {
  if (!isActiveSessionTypeCategorySelection(selectedCategories)) {
    return [];
  }

  const selectedCategory = selectedCategories[0];

  return options.filter(({ id }) => id === selectedCategory);
}

export function normalizeSessionTypeCategorySelection(selectedCategories: SessionTypeCategoryFilter[]): SessionTypeCategoryFilter[] {
  const selectedCategory = selectedCategories[0];

  if (!selectedCategory) {
    return [];
  }

  return [selectedCategory];
}

export function parseSessionTypeCategorySelectionFromQueryParam(value: string | string[] | null | undefined): SessionTypeCategoryFilter[] {
  const rawValues = (Array.isArray(value) ? value : [value]).filter((paramValue): paramValue is string => typeof paramValue === 'string');
  const validValues = rawValues.filter((paramValue): paramValue is SessionTypeCategoryFilter =>
    Object.values(SessionTypeCategoryFilter).includes(paramValue as SessionTypeCategoryFilter),
  );

  return normalizeSessionTypeCategorySelection(validValues.slice(0, 1));
}

export function isActiveSessionTypeCategorySelection(selectedCategories: SessionTypeCategoryFilter[]): boolean {
  return normalizeSessionTypeCategorySelection(selectedCategories).length > 0;
}

export function toSessionTypeCategoryQueryParam(selectedCategories: SessionTypeCategoryFilter[]): string[] | undefined {
  const selectedCategory = normalizeSessionTypeCategorySelection(selectedCategories)[0];

  if (selectedCategory === SessionTypeCategoryFilter.SHOP_PRODUCT) {
    return [...SessionTypeCategoryApiParams.SHOP_PRODUCT];
  }

  if (selectedCategory === SessionTypeCategoryFilter.TICKETS_AND_ADD_ONS) {
    return [...SessionTypeCategoryApiParams.TICKETS_AND_ADD_ONS];
  }

  return undefined;
}

export function buildSessionTypeCategoryHttpParams(sessionTypeCategories?: string[]): HttpParams | undefined {
  if (!sessionTypeCategories?.length) {
    return undefined;
  }

  return sessionTypeCategories.reduce((params, category) => params.append('session_type_category', category), new HttpParams());
}
