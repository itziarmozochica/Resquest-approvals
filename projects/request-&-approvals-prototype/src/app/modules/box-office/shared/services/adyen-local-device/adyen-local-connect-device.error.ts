/**
 * Every way connecting a Box Office device to an Adyen local terminal can fail, named after the
 * failure and not after the layer that raised it. `Record`-based mapping below means adding a
 * failure is a compile error until it has copy and a field.
 */
export type AdyenLocalConnectDeviceFailure =
  | 'bridge_unavailable'
  | 'device_keystore_unavailable'
  | 'enrolment_endpoint_unavailable'
  | 'enrolment_rejected'
  | 'key_storage_failed'
  | 'save_failed'
  | 'terminal_external_id_invalid'
  | 'terminal_ip_invalid'
  | 'terminal_not_supported'
  | 'terminal_unreachable'
  | 'unexpected'
  | 'untrusted_certificate';

export class AdyenLocalConnectDeviceError extends Error {
  constructor(
    readonly failure: AdyenLocalConnectDeviceFailure,
    readonly cause?: unknown,
  ) {
    super(`[AdyenLocalConnectDevice] ${failure}`);
    this.name = 'AdyenLocalConnectDeviceError';
  }
}

export function isAdyenLocalConnectDeviceError(error: unknown): error is AdyenLocalConnectDeviceError {
  return error instanceof AdyenLocalConnectDeviceError;
}

/** `ip` puts the message under the IP field, the only value the operator can change here. */
type ConnectDeviceFailureField = 'ip' | 'section';

interface ConnectDeviceFailureDisplay {
  field: ConnectDeviceFailureField;
  messageKey: string;
}

const COPY_PREFIX = 'paymentConfig.editor.gateway.terminals.adyenLocal.connect.errors';

export const ADYEN_LOCAL_CONNECT_DEVICE_FAILURES: Record<AdyenLocalConnectDeviceFailure, ConnectDeviceFailureDisplay> = {
  bridge_unavailable: { field: 'section', messageKey: `${COPY_PREFIX}.bridgeUnavailable` },
  device_keystore_unavailable: { field: 'section', messageKey: `${COPY_PREFIX}.deviceKeystoreUnavailable` },
  enrolment_endpoint_unavailable: { field: 'section', messageKey: `${COPY_PREFIX}.enrolmentEndpointUnavailable` },
  enrolment_rejected: { field: 'section', messageKey: `${COPY_PREFIX}.enrolmentRejected` },
  key_storage_failed: { field: 'section', messageKey: `${COPY_PREFIX}.keyStorageFailed` },
  save_failed: { field: 'section', messageKey: `${COPY_PREFIX}.saveFailed` },
  terminal_external_id_invalid: { field: 'ip', messageKey: `${COPY_PREFIX}.terminalExternalIdInvalid` },
  terminal_ip_invalid: { field: 'ip', messageKey: `${COPY_PREFIX}.terminalIpInvalid` },
  terminal_not_supported: { field: 'ip', messageKey: `${COPY_PREFIX}.terminalNotSupported` },
  terminal_unreachable: { field: 'ip', messageKey: `${COPY_PREFIX}.terminalUnreachable` },
  unexpected: { field: 'section', messageKey: `${COPY_PREFIX}.unexpected` },
  untrusted_certificate: { field: 'ip', messageKey: `${COPY_PREFIX}.untrustedCertificate` },
};
