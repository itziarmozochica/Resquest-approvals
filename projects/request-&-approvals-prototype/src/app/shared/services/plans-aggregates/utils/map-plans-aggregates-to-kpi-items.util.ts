import { formatNumber } from '@angular/common';

import { Money } from '@fz-original/app/shared/models/money.model';
import { AggregateKpiItem } from '@fz-original/app/shared/models/plans-aggregates/aggregate-kpi-item.model';
import { PlanAggregateId } from '@fz-original/app/shared/models/plans-aggregates/plan-aggregate-id.enum';
import { PlanAggregateItem, PlansAggregatesData } from '@fz-original/app/shared/models/plans-aggregates/plans-aggregates.model';

const AGGREGATE_DISPLAY_ORDER: PlanAggregateId[] = [
  PlanAggregateId.EventCount,
  PlanAggregateId.SessionsThisWeek,
  PlanAggregateId.TicketsSold,
  PlanAggregateId.GrossRevenue,
];

const AGGREGATE_LABEL_KEYS: Record<PlanAggregateId, string> = {
  [PlanAggregateId.EventCount]: 'listPlan.aggregates.events',
  [PlanAggregateId.SessionsThisWeek]: 'listPlan.aggregates.sessionsThisWeek',
  [PlanAggregateId.TicketsSold]: 'listPlan.aggregates.ticketsSold',
  [PlanAggregateId.GrossRevenue]: 'listPlan.aggregates.grossRevenue',
};

const formatBigIntValue = (value: number, locale: string): string => formatNumber(value, locale, '1.0-0');

const formatMoneyAggregateValue = (value: number, currency: string, locale: string): string =>
  new Money(value, currency).toString(locale, '1.0-0');

const getMoneyCurrency = (aggregate: PlanAggregateItem): string => {
  const currency = aggregate.metadata?.['currency'];

  return typeof currency === 'string' ? currency : '';
};

const formatAggregateValue = (aggregate: PlanAggregateItem, locale: string): string => {
  if (aggregate.aggregate_type === 'money') {
    return formatMoneyAggregateValue(aggregate.value, getMoneyCurrency(aggregate), locale);
  }

  return formatBigIntValue(aggregate.value, locale);
};

const isPlanAggregateId = (id: string): id is PlanAggregateId => Object.values(PlanAggregateId).includes(id as PlanAggregateId);

export const mapPlansAggregatesToKpiLabels = (translate: (key: string) => string): AggregateKpiItem[] =>
  AGGREGATE_DISPLAY_ORDER.map(id => ({
    id,
    label: translate(AGGREGATE_LABEL_KEYS[id]),
    value: '',
  }));

export const mapPlansAggregatesToKpiItems = (
  data: PlansAggregatesData | null,
  translate: (key: string) => string,
  locale: string,
): AggregateKpiItem[] => {
  const aggregatesById = new Map((data?.aggregates ?? []).map(aggregate => [aggregate.id, aggregate]));

  return AGGREGATE_DISPLAY_ORDER.flatMap(id => {
    const aggregate = aggregatesById.get(id);

    if (!aggregate || !isPlanAggregateId(aggregate.id)) {
      return [];
    }

    return [
      {
        id: aggregate.id,
        label: translate(AGGREGATE_LABEL_KEYS[aggregate.id]),
        value: formatAggregateValue(aggregate, locale),
      },
    ];
  });
};
