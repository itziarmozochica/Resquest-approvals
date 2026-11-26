export interface EsrRegisterResponse {
  TraC: TraC;
}

export interface TraC {
  SQ: string;
  Result: TraCResult;
  ESR?: TraCEsr;
  Fis?: TraCFis;
  Z?: TraCZ;
}

export interface TraCZ {
  T?: unknown;
  ZI?: unknown;
  ZTaxA?: unknown;
}

export interface TraCResult {
  RC: string;
  ErrorCode?: string;
}

export interface TraCEsr {
  D: string;
  FN?: string | number;
  TN?: string | number;
}

export interface TraCFis {
  TID: string;
  Code: string;
  Tag?: TraCTag[];
}

export interface TraCTag {
  Label: string;
  Value: string;
  Name: string;
}
