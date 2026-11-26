import { ValidationTypeEnum } from '../enums/validation-type.enum';

export interface ValidationMixpanelData {
  validation_type: ValidationTypeEnum;
  input_type: string;
  input: string;
  order?: number;
  type?: string;
  ticketId?: number;
  ticketCount?: number;
  codes?: string[];
  payment_gateway?: string;
}
