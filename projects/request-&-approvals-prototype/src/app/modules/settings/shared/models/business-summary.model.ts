import { Business } from './business.model';

export class BusinessSummary {
  constructor(
    public total: number,
    public businesses: Business[],
  ) {}
}
