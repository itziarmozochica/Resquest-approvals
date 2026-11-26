import { Injectable } from '@angular/core';

import { resolvePaymentMethodLabel } from '@fz-original/app/shared/utils/payment-method-display/payment-method-display.util';

import { AdapterInterface } from '../../../../../core/adapter.interface';
import {
  AdyenLocalProviderConfig,
  PayhereProviderConfig,
  PaymentConfigurationAvailableMethodsCatalog,
  PaymentConfigurationCatalogMethod,
  PaymentConfigurationCheckout,
  PaymentConfigurationDetail,
  PaymentConfigurationGateway,
  PaymentConfigurationGatewayMethod,
  PaymentConfigurationGatewayProvider,
  PaymentConfigurationInput,
  PaymentConfigurationMethodInput,
  PaymentConfigurationProviderConfig,
  PaymentConfigurationSummary,
  PaymentConfigurationTerminal,
  PaymentConfigurationV2,
  PaymentConfigurationV2Input,
  PaymentConfigurationV2Method,
  PaymentConfigurationWriteResult,
  PaymentConfigurationWriteResultTerminal,
  SquareProviderConfig,
} from '../../models/payment-configuration';
import {
  AdyenLocalProviderConfigDto,
  PayhereProviderConfigDto,
  PaymentConfigurationAvailableMethodsCatalogDto,
  PaymentConfigurationBodyDto,
  PaymentConfigurationCatalogMethodDto,
  PaymentConfigurationCheckoutDto,
  PaymentConfigurationDetailDto,
  PaymentConfigurationGatewayDto,
  PaymentConfigurationMethodDto,
  PaymentConfigurationMethodReferenceDto,
  PaymentConfigurationSummaryDto,
  PaymentConfigurationTerminalDto,
  PaymentConfigurationV2BodyDto,
  PaymentConfigurationV2Dto,
  PaymentConfigurationV2MethodDto,
  PaymentConfigurationWriteResultDto,
  PaymentConfigurationWriteResultTerminalDto,
  ProviderConfigDto,
  SquareProviderConfigDto,
} from '../../models/payment-configuration-dto';

@Injectable({
  providedIn: 'root',
})
export class PaymentConfigurationsAdapter implements AdapterInterface<PaymentConfigurationDetail, PaymentConfigurationDetailDto> {
  fromApi(dto: PaymentConfigurationDetailDto): PaymentConfigurationDetail {
    return {
      allowSplitPayments: dto.allow_split_payments,
      assignedToOnsiteSetups: (dto.assigned_to_onsite_setups ?? []).map(setup => ({ id: setup.id, name: setup.name })),
      countryCode: dto.country_code,
      createdAt: dto.created_at,
      delegatedMethods: (dto.delegated_methods ?? []).map(method => this.#fromMethodDto(method)),
      gateways: (dto.gateways ?? []).map(gateway => this.#fromGatewayDto(gateway)),
      id: dto.id,
      name: dto.name,
    };
  }

  fromApiAvailableMethods(dto: PaymentConfigurationAvailableMethodsCatalogDto): PaymentConfigurationAvailableMethodsCatalog {
    return {
      countryCode: dto.country_code,
      delegatedMethods: (dto.delegated_methods ?? []).map(method => this.#fromCatalogMethodDto(method)),
      providers: (dto.providers ?? []).map(provider => ({
        methods: (provider.methods ?? []).map(method => this.#fromCatalogMethodDto(method)),
        provider: provider.provider,
      })),
    };
  }

  fromApiList(dtos: PaymentConfigurationSummaryDto[]): PaymentConfigurationSummary[] {
    return dtos.map(dto => ({
      assignedToOnsiteSetupCount: dto.assigned_to_onsite_setup_count,
      createdAt: dto.created_at,
      id: dto.id,
      integratedGatewayProvider: dto.integrated_gateway_provider,
      methodCount: dto.method_count,
      name: dto.name,
      terminalCount: dto.terminal_count,
      updatedAt: dto.updated_at,
    }));
  }

  fromApiV2(dto: PaymentConfigurationV2Dto): PaymentConfigurationV2 {
    return {
      allowSplitPayments: dto.allow_split_payments ?? dto.checkout.multi_flow.enabled,
      assignedToOnsiteSetups: (dto.assigned_to_onsite_setups ?? []).map(setup => ({ id: setup.id, name: setup.name })),
      checkout: this.#fromCheckoutDto(dto.checkout),
      createdAt: dto.created_at,
      delegatedMethods: (dto.delegated?.methods ?? []).map(method => this.#fromV2MethodDto(method)),
      gateways: (dto.gateways ?? []).map(gateway => ({
        methods: (gateway.methods ?? []).map(method => this.#fromV2MethodDto(method)),
        provider: gateway.provider,
        providerConfig: this.#fromProviderConfigDto(gateway.provider, gateway.config ?? null),
        terminals: (gateway.terminals ?? []).map(terminal => this.#fromTerminalDto(terminal)),
      })),
      id: dto.id,
      name: dto.name,
      version: dto.version,
    };
  }

  fromApiWriteResult(dto: PaymentConfigurationWriteResultDto | null): PaymentConfigurationWriteResult {
    return {
      allowSplitPayments: dto?.allow_split_payments ?? false,
      id: dto?.id ?? '',
      integratedGatewayProvider: dto?.integrated_gateway_provider ?? null,
      methods: (dto?.methods ?? []).map(method => ({ gatewayProvider: method.gateway_provider, methodCode: method.method_code })),
      name: dto?.name ?? '',
      terminals: (dto?.terminals ?? []).map(terminal => this.#fromWriteResultTerminalDto(terminal)),
    };
  }

  toBodyDto(input: PaymentConfigurationInput): PaymentConfigurationBodyDto {
    const providerConfig = this.#toProviderConfigDto(input.integratedGatewayProvider, input.providerConfig);
    return {
      allow_split_payments: input.allowSplitPayments,
      integrated_gateway_provider: input.integratedGatewayProvider,
      methods: input.methods.map(method => ({ gateway_provider: method.gatewayProvider, method_code: method.methodCode })),
      name: input.name,
      ...(providerConfig !== null && { provider_config: providerConfig }),
      terminals: input.terminals.map(terminal => ({
        external_id: terminal.externalId,
        ip_address: terminal.ipAddress,
        ...(terminal.label !== undefined && { label: terminal.label }),
      })),
    };
  }

  toBodyDtoV2(input: PaymentConfigurationV2Input): PaymentConfigurationV2BodyDto {
    const provider = input.integratedGatewayProvider;
    const providerConfig = this.#toProviderConfigDto(provider, input.providerConfig);
    const methodsOf = (gatewayProvider: PaymentConfigurationMethodInput['gatewayProvider']): { code: string }[] =>
      input.methods.filter(method => method.gatewayProvider === gatewayProvider).map(method => ({ code: method.methodCode }));
    return {
      allow_split_payments: input.allowSplitPayments,
      checkout: this.#toCheckoutDto(input.checkout),
      delegated: { methods: methodsOf('delegated') },
      gateways:
        provider === null
          ? []
          : [
              {
                ...(providerConfig !== null && { config: providerConfig }),
                methods: methodsOf(provider),
                provider,
                terminals: input.terminals.map(terminal => ({
                  external_id: terminal.externalId,
                  ip_address: terminal.ipAddress,
                  ...(terminal.label !== undefined && { label: terminal.label }),
                })),
              },
            ],
      name: input.name,
      ...(input.version !== null && { version: input.version }),
    };
  }

  #fromCatalogMethodDto(dto: PaymentConfigurationCatalogMethodDto): PaymentConfigurationCatalogMethod {
    return { code: dto.code, defaultDisplayNameKey: dto.default_display_name_key, name: resolvePaymentMethodLabel(dto.name, dto.code) };
  }

  #fromCheckoutDto(dto: PaymentConfigurationCheckoutDto): PaymentConfigurationCheckout {
    return {
      multiFlow: { enabled: dto.multi_flow.enabled, flows: [...dto.multi_flow.flows] },
      paymentMethods: dto.payment_methods.map(method => this.#fromMethodReferenceDto(method)),
      quickActions: dto.quick_actions.map(action =>
        action.type === 'payment_method' ? { type: action.type, ...this.#fromMethodReferenceDto(action) } : { type: action.type },
      ),
    };
  }

  #fromGatewayDto(dto: PaymentConfigurationGatewayDto): PaymentConfigurationGateway {
    return {
      id: dto.id,
      methods: (dto.methods ?? []).map(method => this.#fromMethodDto(method)),
      provider: dto.provider,
      providerConfig: this.#fromProviderConfigDto(dto.provider, dto.provider_config ?? null),
      terminals: (dto.terminals ?? []).map(terminal => this.#fromTerminalDto(terminal)),
    };
  }

  #fromMethodDto(dto: PaymentConfigurationMethodDto): PaymentConfigurationGatewayMethod {
    return {
      defaultDisplayNameKey: dto.default_display_name_key,
      id: dto.id,
      isActive: dto.is_active,
      methodCode: dto.method_code,
    };
  }

  #fromMethodReferenceDto(dto: PaymentConfigurationMethodReferenceDto): PaymentConfigurationMethodInput {
    return { gatewayProvider: dto.provider, methodCode: dto.code };
  }

  #fromProviderConfigDto(
    provider: PaymentConfigurationGatewayProvider,
    dto: ProviderConfigDto | null,
  ): PaymentConfigurationProviderConfig | null {
    if (dto === null) {
      return null;
    }
    switch (provider) {
      case 'adyen':
        return null;
      case 'adyen_local': {
        const adyenLocal = dto as AdyenLocalProviderConfigDto;
        return {
          adyenMerchantAccount: adyenLocal.adyen_merchant_account,
          keyIdentifier: adyenLocal.key_identifier ?? null,
          keyPassphrase: null,
          keyVersion: adyenLocal.key_version ?? null,
          tapToPayEnabled: adyenLocal.tap_to_pay_enabled === true,
        };
      }
      case 'square': {
        const square = dto as SquareProviderConfigDto;
        return { applicationId: square.application_id, squareLocationId: square.location_id };
      }
      case 'payhere': {
        const payhere = dto as PayhereProviderConfigDto;
        return { merchantId: payhere.merchant_id };
      }
    }
  }

  #fromTerminalDto(dto: PaymentConfigurationTerminalDto): PaymentConfigurationTerminal {
    return {
      externalId: dto.external_id,
      id: dto.id,
      ipAddress: dto.ip_address ?? null,
      isActive: dto.is_active,
      label: dto.label,
    };
  }

  #fromV2MethodDto(dto: PaymentConfigurationV2MethodDto): PaymentConfigurationV2Method {
    return { defaultDisplayNameKey: dto.display_name_key, isActive: dto.is_active, methodCode: dto.code };
  }

  #fromWriteResultTerminalDto(dto: PaymentConfigurationWriteResultTerminalDto): PaymentConfigurationWriteResultTerminal {
    return {
      externalId: dto.external_id,
      id: dto.id,
      label: dto.label,
    };
  }

  #toCheckoutDto(checkout: PaymentConfigurationCheckout): PaymentConfigurationCheckoutDto {
    return {
      multi_flow: { enabled: checkout.multiFlow.enabled, flows: [...checkout.multiFlow.flows] },
      payment_methods: checkout.paymentMethods.map(method => this.#toMethodReferenceDto(method)),
      quick_actions: checkout.quickActions.map(action =>
        action.type === 'payment_method' ? { type: action.type, ...this.#toMethodReferenceDto(action) } : { type: action.type },
      ),
    };
  }

  #toMethodReferenceDto(method: PaymentConfigurationMethodInput): PaymentConfigurationMethodReferenceDto {
    return { code: method.methodCode, provider: method.gatewayProvider };
  }

  #toProviderConfigDto(
    provider: PaymentConfigurationGatewayProvider | null,
    config: PaymentConfigurationProviderConfig | null,
  ): ProviderConfigDto | null {
    if (provider === null || config === null) {
      return null;
    }
    switch (provider) {
      case 'adyen':
        return null;
      case 'adyen_local': {
        const adyenLocal = config as AdyenLocalProviderConfig;
        return {
          adyen_merchant_account: adyenLocal.adyenMerchantAccount,
          key_identifier: adyenLocal.keyIdentifier,
          // The key is write-once: on edit there is no passphrase to send.
          ...(adyenLocal.keyPassphrase !== null && { key_passphrase: adyenLocal.keyPassphrase }),
          key_version: adyenLocal.keyVersion,
          tap_to_pay_enabled: adyenLocal.tapToPayEnabled,
        };
      }
      case 'square': {
        const square = config as SquareProviderConfig;
        return { application_id: square.applicationId, location_id: square.squareLocationId };
      }
      case 'payhere': {
        const payhere = config as PayhereProviderConfig;
        return { merchant_id: payhere.merchantId };
      }
    }
  }
}
