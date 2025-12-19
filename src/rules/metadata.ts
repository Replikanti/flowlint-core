import rulesData from './rules-data.json';

export interface RuleMetadata {
  id: string;
  name: string;
  severity: 'must' | 'should' | 'nit';
  description: string;
  details: string;
}

export const RULES_METADATA: RuleMetadata[] = rulesData as RuleMetadata[];



