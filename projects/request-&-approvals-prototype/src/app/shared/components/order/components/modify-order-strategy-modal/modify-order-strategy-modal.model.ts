export type ModifyOrderStrategy = 'dynamic' | 'fixed';

export interface ModifyOrderStrategyModalResult {
  strategy: ModifyOrderStrategy;
}
