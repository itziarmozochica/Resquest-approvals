export interface AdyenLocalDeviceEnrolmentBodyDto {
  device_public_key: string;
  ip_address: string;
  payment_configuration_id: string;
  device_serial_number: string;
}

export interface AdyenLocalSealedKeyDto {
  ciphertext: string;
  device_serial_number?: string;
  envelope_version: number;
  iv: string;
  key_version: number;
  wrapped_key: string;
}
