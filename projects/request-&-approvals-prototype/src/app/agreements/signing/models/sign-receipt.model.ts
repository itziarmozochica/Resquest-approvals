/** Captured when the sign call succeeds, since the sign context it derives from is cleared in the same patch. */
export interface SignReceipt {
  acceptedAt: string;
  agreementTitle: string;
  coveringLabel: string | null;
  signerEmail: string;
  version: number;
}
