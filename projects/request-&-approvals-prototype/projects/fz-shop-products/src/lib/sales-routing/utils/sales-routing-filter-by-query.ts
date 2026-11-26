import type { Plan } from '../models/sales-routing.model';

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query);
}

function planMatchesQuery(plan: Plan, query: string): boolean {
  if (matchesQuery(plan.name, query)) {
    return true;
  }
  if (matchesQuery(plan.cityName, query)) {
    return true;
  }
  if (matchesQuery(plan.placeName, query)) {
    return true;
  }
  return plan.channels.some(
    channel => matchesQuery(channel.name, query) || channel.warehouses.some(warehouse => matchesQuery(warehouse.name, query)),
  );
}

export function salesRoutingFilterByQuery(plans: Plan[], searchQuery: string): Plan[] {
  const query = searchQuery.trim().toLowerCase();
  if (query.length === 0) {
    return plans;
  }
  return plans.filter(plan => planMatchesQuery(plan, query));
}
