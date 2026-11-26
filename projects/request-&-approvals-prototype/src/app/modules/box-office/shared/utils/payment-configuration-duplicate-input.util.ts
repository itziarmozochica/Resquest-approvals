import {
  PaymentConfigurationDetail,
  PaymentConfigurationInput,
  PaymentConfigurationMethodInput,
  PaymentConfigurationV2,
} from '../models/payment-configuration';

export function buildPaymentConfigurationDuplicateInput(
  detail: PaymentConfigurationDetail | PaymentConfigurationV2,
  name: string,
): PaymentConfigurationInput {
  const gateway = detail.gateways[0] ?? null;
  const integratedMethods: PaymentConfigurationMethodInput[] =
    gateway === null ? [] : gateway.methods.map(method => ({ gatewayProvider: gateway.provider, methodCode: method.methodCode }));
  const delegatedMethods: PaymentConfigurationMethodInput[] = detail.delegatedMethods.map(method => ({
    gatewayProvider: 'delegated' as const,
    methodCode: method.methodCode,
  }));

  return {
    allowSplitPayments: detail.allowSplitPayments,
    integratedGatewayProvider: gateway?.provider ?? null,
    methods: [...integratedMethods, ...delegatedMethods],
    name,
    providerConfig: gateway?.providerConfig ?? null,
    terminals: (gateway?.terminals ?? []).map(terminal => ({
      externalId: terminal.externalId,
      ipAddress: terminal.ipAddress,
      label: terminal.label ?? undefined,
    })),
  };
}
