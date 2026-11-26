import { FormInputFieldTypeET } from '@fz-original/app/app/enums/html-tag.enum';

export type IgntInputFieldType = Omit<
  FormInputFieldTypeET,
  'file' | 'color' | 'range' | 'checkbox' | 'radio' | 'button' | 'submit' | 'reset'
>;
export interface IngtFormError {
  type: string;
  message: string;
}
