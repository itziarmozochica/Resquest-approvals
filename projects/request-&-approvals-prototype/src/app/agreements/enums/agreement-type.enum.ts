export enum AgreementType {
  waiver = 'waiver',
}

export interface AgreementTypeMeta {
  readonly color: string;
  readonly label: string;
}

export const AGREEMENT_TYPE_META: Readonly<Record<AgreementType, AgreementTypeMeta>> = {
  [AgreementType.waiver]: { color: '#0089e3', label: 'Waiver' },
};
