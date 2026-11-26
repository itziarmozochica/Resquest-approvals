export interface AgreementVersion {
  agreementId: string;
  content: string | null;
  contentHash: string;
  createdAt: string;
  id: string;
  priorAcceptanceValid: boolean;
  supersedesVersionId: string | null;
  version: number;
}
