import { FzAssistantActErrorCode, FzAssistantElementBase, FzAssistantStepStatus, FzAssistantWireValue } from './fz-assistant-wire.model';

export type AssistantFillStatus = Extract<FzAssistantStepStatus, 'ok' | 'halt'>;

export type AssistantApplyValue = Exclude<FzAssistantWireValue, null>;

export interface AssistantWidgetSnapshot extends FzAssistantElementBase {
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadonly?: boolean;
  isSelected?: boolean;
  isConfirmationRequired?: boolean;
  isComposite?: boolean;
  widget?: string;
}

/**
 * The three snapshot flags Act reads before it writes or gates.
 *
 * Named separately so the confirmation gate can be a pure function of the step and the state, rather
 * than calling `getAssistantSnapshot()` a second time: widget code, and two reads of it can disagree.
 * Act reads the snapshot once per step and hands the result on.
 */
export type AssistantWidgetState = Pick<AssistantWidgetSnapshot, 'isConfirmationRequired' | 'isDisabled' | 'isReadonly'>;

export interface AssistantFillResult {
  status: AssistantFillStatus;
  value_applied?: FzAssistantWireValue;
  error?: FzAssistantActErrorCode;
}

export interface FzAssistantCapable {
  getAssistantSnapshot(): AssistantWidgetSnapshot;
  applyAssistantValue(value: AssistantApplyValue): Promise<AssistantFillResult>;
}
