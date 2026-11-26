export interface OrderAgreementSigner {
  acceptedAt: string;
  individualAgreementId: string;
  minorName: string | null;
  signerName: string;
}
