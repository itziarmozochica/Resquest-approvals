import { Money } from '@fz-original/app/shared/models/money.model';

export enum ActionRuleConditionType {
  LowAvailability = 'low_availability',
}

export enum ActionRuleActionType {
  UpdateVisibility = 'update_visibility',
  OpenPurchasabilityWindow = 'open_purchasability_window',
}

export interface ActionRuleConditionBaseDTO {
  condition_type: ActionRuleConditionType;
}

export interface ActionRuleConditionBase {
  conditionType: ActionRuleConditionType;
}

export interface ActionRuleSessionDTO {
  id: number;
  label: string;
  ticket_price: Money | null;
  starts_at: string;
  starts_at_utc: string;
}

export interface ActionRuleSession {
  id: number;
  label: string;
  ticketPrice: Money | null;
  startsAt: Date;
}

export interface ActionRuleConditionLowAvailabilityDTO extends ActionRuleConditionBaseDTO {
  source_session: ActionRuleSessionDTO;
  condition_type: ActionRuleConditionType.LowAvailability;
  availability: number;
}

export interface ActionRuleConditionLowAvailability extends ActionRuleConditionBase {
  sourceSession: ActionRuleSession;
  conditionType: ActionRuleConditionType.LowAvailability;
  availability: number;
}

export interface ActionRuleConditionCreateUpdateLowAvailabilityDTO extends Omit<ActionRuleConditionLowAvailabilityDTO, 'source_session'> {
  source_session_id: number;
}

export interface ActionRuleConditionCreateUpdateLowAvailability extends Omit<ActionRuleConditionLowAvailability, 'sourceSession'> {
  sourceSessionId: number;
}

export type ActionRuleConditionDTO = ActionRuleConditionLowAvailabilityDTO;
export type ActionRuleCondition = ActionRuleConditionLowAvailability;

export type ActionRuleConditionCreateUpdateDTO = ActionRuleConditionCreateUpdateLowAvailabilityDTO;
export type ActionRuleConditionCreateUpdate = ActionRuleConditionCreateUpdateLowAvailability;

export interface ActionRuleActionBaseDTO {
  action_type: ActionRuleActionType;
}

export interface ActionRuleActionBase {
  actionType: ActionRuleActionType;
}

export interface ActionRuleActionUpdateVisibilityDTO extends ActionRuleActionBaseDTO {
  action_type: ActionRuleActionType.UpdateVisibility;
  hidden: boolean;
}

export interface ActionRuleActionOpenPurchasabilityWindowDTO extends ActionRuleActionBaseDTO {
  action_type: ActionRuleActionType.OpenPurchasabilityWindow;
}

export interface ActionRuleActionUpdateVisibility extends ActionRuleActionBase {
  actionType: ActionRuleActionType.UpdateVisibility;
  hidden: boolean;
}

export interface ActionRuleActionOpenPurchasabilityWindow extends ActionRuleActionBase {
  actionType: ActionRuleActionType.OpenPurchasabilityWindow;
}

export type ActionRuleActionDTO = ActionRuleActionUpdateVisibilityDTO | ActionRuleActionOpenPurchasabilityWindowDTO;
export type ActionRuleAction = ActionRuleActionUpdateVisibility | ActionRuleActionOpenPurchasabilityWindow;

export interface ActionRuleDTO {
  condition: ActionRuleConditionDTO;
  action: ActionRuleActionDTO;
}

export interface ActionRule {
  condition: ActionRuleCondition;
  action: ActionRuleAction;
}

export interface ActionRuleCreateUpdateDTO extends Omit<ActionRuleDTO, 'condition'> {
  condition: ActionRuleConditionCreateUpdateDTO;
}

export interface ActionRuleCreateUpdate extends Omit<ActionRule, 'condition'> {
  condition: ActionRuleConditionCreateUpdate;
}

export interface SessionActionRulesCreateDTO {
  target_session_ids: number[];
  rules: ActionRuleCreateUpdateDTO[];
  notification_emails?: string[];
}

export interface SessionActionRulesCreate {
  targetSessionIds: number[];
  rules: ActionRuleCreateUpdate[];
  notificationEmails?: string[];
}

export interface SessionActionRuleUpdateDTO {
  target_session_ids: number[];
  action: ActionRuleActionDTO;
  condition: ActionRuleConditionCreateUpdateDTO;
  notification_emails?: string[];
}

export interface SessionActionRuleUpdate {
  targetSessionIds: number[];
  action: ActionRuleAction;
  condition: ActionRuleConditionCreateUpdate;
  notificationEmails?: string[];
}

export interface SessionActionRuleListItemDTO {
  id: number;
  created_at: string;
  triggered_at?: string | null;
  triggered_at_utc?: string | null;
  updated_at?: string | null;
  error?: string;
  target_sessions: ActionRuleSessionDTO[];
  condition: ActionRuleConditionDTO;
  action: ActionRuleActionDTO;
  notification_emails?: string[];
}

export interface SessionActionRuleListItem {
  id: number;
  createdAt: Date;
  updatedAt?: Date | null;
  triggeredAt?: Date | null;
  error?: string;
  targetSessions: ActionRuleSession[];
  condition: ActionRuleCondition;
  action: ActionRuleAction;
  notificationEmails?: string[];
}
