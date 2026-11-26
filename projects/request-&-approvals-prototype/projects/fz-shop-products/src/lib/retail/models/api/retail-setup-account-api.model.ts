export interface RetailSetupAccountApi {
  id: string;
  label: string;
}

export interface RetailSetupAccountsResponse {
  data: RetailSetupAccountApi[] | null;
  error: unknown;
}
