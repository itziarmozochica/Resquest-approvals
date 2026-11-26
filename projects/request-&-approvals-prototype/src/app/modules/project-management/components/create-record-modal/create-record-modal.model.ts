export type CreateRecordType = 'request' | 'approval';

export interface CreateRecordModalData {
  canCreateInformationRequest: boolean;
  canCreateApproval: boolean;
}

export interface CreateRecordModalResult {
  type: CreateRecordType;
}
