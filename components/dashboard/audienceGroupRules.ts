import type { AudienceGroupSchema } from '@/types/project';

export type Rule = { id: number; filter: string; operator: string; value: string; property?: string };
export type Block = { id: number; rules: Rule[] };

export const makeRule = (id: number): Rule => ({ id, filter: '', operator: '', value: '' });
export const makeBlock = (id: number, ruleId: number): Block => ({ id, rules: [makeRule(ruleId)] });

const legacyField: Record<string, string> = {
  Email: 'email',
  'Current Lifecycle Segment': 'lifecycleSegmentId',
  Country: 'country',
  Region: 'region',
  'Preferred Language': 'preferredLanguage',
  Platform: 'platform',
  'Push Enabled': 'pushEnabled',
  'Email Available': 'emailAvailable',
  'Last Active': 'lastActiveAt',
  'Last Notified': 'lastNotified',
};
const legacyOperator: Record<string, string> = {
  Is: 'equals',
  'Is not': 'not_equals',
  Contains: 'contains',
  'Is available': 'exists',
  'Is not available': 'not_exists',
  'In the last': 'within_days',
  More: 'greater_than',
  'More than': 'not_within_days',
  'Exclude users notified in the last X days': 'exclude_in_last_days',
};

export function toBackendCondition(rule: Rule, schema?: AudienceGroupSchema) {
  const field = schema?.fields.find(item => item.key === rule.filter || item.label === rule.filter);
  const condition = field?.conditions.find(item => item.key === rule.operator || item.label === rule.operator);
  const value = rule.value.trim();
  const parsedValue = condition?.value.multiple ? value.split(',').map(item => item.trim()).filter(Boolean) : value;
  return {
    field: field?.key ?? legacyField[rule.filter] ?? rule.filter,
    operator: condition?.key ?? legacyOperator[rule.operator] ?? rule.operator,
    ...(rule.property?.trim() ? { property: rule.property.trim() } : {}),
    ...(value ? { value: parsedValue } : {}),
  };
}

function schemaCondition(rule: Rule, schema?: AudienceGroupSchema) {
  const field = schema?.fields.find(item => item.key === rule.filter || item.label === rule.filter);
  return field?.conditions.find(item => item.key === rule.operator || item.label === rule.operator);
}

function schemaField(rule: Rule, schema?: AudienceGroupSchema) {
  return schema?.fields.find(item => item.key === rule.filter || item.label === rule.filter);
}

function valueIsValid(rule: Rule, condition: NonNullable<ReturnType<typeof schemaCondition>>) {
  if (condition.value.type === 'none' || condition.value.required === false) return true;
  const values = rule.value.split(',').map(item => item.trim()).filter(Boolean);
  if (!values.length) return false;
  if (condition.value.options?.length) return values.every(value => condition.value.options?.some(option => option.key === value));
  if (condition.value.type === 'integer') {
    return values.every(value => {
      if (!/^[+-]?\d+$/.test(value)) return false;
      const number = Number(value);
      return Number.isSafeInteger(number) && number >= (condition.value.min ?? 0);
    });
  }
  if (condition.value.type === 'number') return values.every(value => Number.isFinite(Number(value)));
  if (condition.value.type === 'date') return values.every(value => !Number.isNaN(Date.parse(value)));
  return true;
}

export function ruleHasInput(rule: Rule) {
  return Boolean(rule.filter.trim() || rule.operator.trim() || rule.value.trim() || rule.property?.trim());
}

export function isRuleComplete(rule: Rule, schema?: AudienceGroupSchema) {
  if (!rule.filter.trim() || !rule.operator.trim()) return false;
  if (rule.filter === 'lastNotified') return rule.operator === 'exclude_in_last_days' && /^[1-9]\d*$/.test(rule.value.trim());
  if (!schema) return Boolean(rule.value.trim() || /available|exists|not_exists|never|no_|none/i.test(rule.operator));
  const condition = schemaCondition(rule, schema);
  if (!condition) return false;
  const field = schemaField(rule, schema);
  if (field?.key === 'customProperty') {
    const propertyOptions = field.property?.options ?? [];
    if (!rule.property?.trim() || !propertyOptions.some(option => option.key === rule.property)) return false;
  }
  return valueIsValid(rule, condition);
}

export function toBackendRules(blocks: Block[], schema?: AudienceGroupSchema) {
  if (blocks.some(block => block.rules.some(rule => !isRuleComplete(rule, schema)))) {
    throw new Error('Complete or remove every audience condition before creating the group.');
  }
  const blockRules = (block: Block) => block.rules.map(rule => toBackendCondition(rule, schema));
  const populatedBlocks = blocks.map(blockRules).filter(conditions => conditions.length);
  if (!populatedBlocks.length) return { operator: 'AND' as const, conditions: [] };
  return populatedBlocks.length > 1
    ? { operator: 'OR' as const, conditions: populatedBlocks.map(conditions => ({ operator: 'AND' as const, conditions })) }
    : { operator: 'AND' as const, conditions: populatedBlocks[0] };
}

export function validRuleCount(blocks: Block[], schema?: AudienceGroupSchema) {
  return blocks.reduce((count, block) => count + block.rules.filter(rule => isRuleComplete(rule, schema)).length, 0);
}

export function incompleteRuleCount(blocks: Block[], schema?: AudienceGroupSchema) {
  return blocks.reduce((count, block) => count + block.rules.filter(rule => !isRuleComplete(rule, schema)).length, 0);
}

export function readableRule(rule: Rule, schema?: AudienceGroupSchema) {
  const field = schema?.fields.find(item => item.key === rule.filter || item.label === rule.filter);
  const condition = field?.conditions.find(item => item.key === rule.operator || item.label === rule.operator);
  if ((field?.key ?? rule.filter) === 'lastNotified') return `Exclude users notified in the last ${rule.value.trim()} days`;
  const optionLabel = (value: string) => condition?.value.options?.find(option => option.key === value)?.label ?? value;
  const values = rule.value.split(',').map(item => item.trim()).filter(Boolean).map(optionLabel).join(', ');
  return `${field?.label ?? rule.filter} ${condition?.label ?? rule.operator}${values ? ` ${values}` : ''}${rule.property ? ` (${rule.property})` : ''}`;
}
