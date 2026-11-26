export type SalesRoutingGateway = 'retailSetupError' | 'emptyRetailSetup';

export interface SalesRoutingGatewayResolved {
  readonly gateway: SalesRoutingGateway;
}
