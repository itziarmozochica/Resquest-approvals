export type PartnerUiConfigInterface = {
  deactivateEditableTypeahead?: boolean;
  hidePlanCategory?: boolean;
};

export class PartnerUiConfig implements PartnerUiConfigInterface {
  constructor(
    public deactivateEditableTypeahead?: boolean,
    public hidePlanCategory?: boolean,
  ) {}
}
