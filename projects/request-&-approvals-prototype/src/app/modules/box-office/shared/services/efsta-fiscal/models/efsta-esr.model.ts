export interface EsrRequest {
  Tra: {
    ESR: EsrTransaction;
  };
}

export interface EsrTransaction {
  D: string;
  TL: string;
  TN?: string;
  T?: string;
  TT?: string;
  Ref?: string;
  OrderRef?: string;
  NF?: string;
  NFS?: string;
  Void?: string;
  Opr?: string;
  OprN?: string;
  RFN?: string;
  RD?: string;
  Rsn?: string;
  Ctm?: EsrCustomer;
  Head?: EsrText[];
  Foot?: EsrText[];
  PosA?: EsrPosItem[];
  PayA?: EsrPay[];
  TaxA?: EsrTax[];
}

export interface EsrText {
  _: 'Txt';
  value: string;
}

export interface EsrCustomer {
  Nam: string;
  TaxId: string;
  Adr: string;
  Zip: string;
  City: string;
  Ctry: string;
}

export type EsrPosItem = EsrPos | EsrMod;

export interface EsrPos {
  _: 'Pos';
  PN: string;
  RPN?: string;
  PTY?: string;
  IN?: string;
  VouN?: string;
  Dsc: string;
  TaxG: string;
  Amt: string;
  Qty?: string;
  Pri?: string;
  Void?: string;
}

export interface EsrMod {
  _: 'Mod';
  PN: string;
  Dsc: string;
  Amt: string;
  TaxG?: string;
  VouN?: string;
}

export interface EsrPay {
  _: 'Pay';
  Dsc: string;
  PayG: string;
  Amt: string;
}

export interface EsrTax {
  _: 'Tax';
  TaxG: string;
  Prc: string;
  Net: string;
  TAmt: string;
  Amt: string;
}
