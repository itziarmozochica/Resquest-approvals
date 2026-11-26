import type { IgntIconVariant } from './ignt-icon-variant';
import type { IgntIconName } from './ignt-icon.name';

export interface IgntIconDefinition {
  name: IgntIconName;
  svg: string;
  variant: IgntIconVariant;
}
