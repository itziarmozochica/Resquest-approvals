import { AssistantWidgetSnapshot } from './fz-assistant-capable.model';
import { FzAssistantCaptureErrorCode, FzAssistantTableSummary, FzAssistantViewContextBase } from './fz-assistant-wire.model';

export type FzAssistantAccessibleNameSource =
  | 'computedName'
  | 'aria-label'
  | 'aria-labelledby'
  | 'label-for'
  | 'placeholder'
  | 'title'
  | 'tag-inference'
  | 'widget-snapshot';

export interface FzAssistantA11yRead {
  name: string;
  role: string;
  nameSource?: FzAssistantAccessibleNameSource;
}

export type { FzAssistantCaptureErrorCode, FzAssistantTableSummary };

export interface FzAssistantCapturedElement extends AssistantWidgetSnapshot {
  ref: string;
  label: string;
  capture_error?: FzAssistantCaptureErrorCode;
  role?: string;
  interaction?: string;
  accessibleNameSource?: FzAssistantAccessibleNameSource;
  table_summary?: FzAssistantTableSummary;
}

export interface FzAssistantCapturedViewContext extends FzAssistantViewContextBase {
  elements: FzAssistantCapturedElement[];
}
