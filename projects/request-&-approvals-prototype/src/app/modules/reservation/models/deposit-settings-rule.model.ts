import { DepositSettingsRuleOperatorEnum } from './deposit-settings-rule-operator.enum';
import { DepositSettingsRuleTypeEnum } from './deposit-settings-rule-type.enum';

export interface DepositSettingsRuleDTO {
  rule_type: string;
  value: number | string;
  operator?: string;
}

export interface DepositSettingsRule {
  operator: DepositSettingsRuleOperatorEnum;
  ruleType: DepositSettingsRuleTypeEnum;
  value: number;
}

const RULE_TYPES: readonly DepositSettingsRuleTypeEnum[] = Object.values(DepositSettingsRuleTypeEnum);
const OPERATORS: readonly DepositSettingsRuleOperatorEnum[] = Object.values(DepositSettingsRuleOperatorEnum);

/**
 * The backend serialises `value` as a decimal string (a ticket count reads `"8.00"`), so it is parsed here and kept
 * as a number in the domain model. Rules whose `rule_type` or `operator` this client does not know are dropped:
 * they cannot be rendered, and failing the whole request would take the deposit settings screen down with them.
 */
export function depositSettingsRuleFromDTO(dto: DepositSettingsRuleDTO): DepositSettingsRule | null {
  const ruleType = RULE_TYPES.find(type => type === dto.rule_type);
  const operator = OPERATORS.find(candidate => candidate === (dto.operator ?? DepositSettingsRuleOperatorEnum.GTE));
  const value = Number(dto.value);

  if (!ruleType || !operator || !Number.isFinite(value)) {
    return null;
  }

  return { operator, ruleType, value };
}

export function depositSettingsRulesFromDTO(dtos: DepositSettingsRuleDTO[] | null | undefined): DepositSettingsRule[] {
  return (dtos ?? []).map(depositSettingsRuleFromDTO).filter((rule): rule is DepositSettingsRule => rule !== null);
}

export function depositSettingsRuleToDTO(rule: DepositSettingsRule): DepositSettingsRuleDTO {
  return {
    operator: rule.operator,
    rule_type: rule.ruleType,
    value: rule.value,
  };
}
