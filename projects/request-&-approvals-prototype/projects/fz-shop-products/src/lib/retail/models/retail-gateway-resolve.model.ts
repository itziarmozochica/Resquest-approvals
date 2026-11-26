export type RetailGateway = 'retailsError' | 'createRetail';

export interface RetailGatewayResolved {
  readonly gateway: RetailGateway;
}
