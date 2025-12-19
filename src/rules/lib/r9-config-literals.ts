import { createHardcodedStringRule } from '../rule-utils';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R9',
  name: 'config_literals',
  severity: 'should',
  description: 'Flags hardcoded literals (URLs, environment tags, tenant IDs) that should come from configuration.',
  details: 'Promotes externalized configuration and prevents hardcoded environment-specific values.',
};

export const r9ConfigLiterals = createHardcodedStringRule({
  ruleId: metadata.id,
  severity: metadata.severity,
  configKey: 'config_literals',
  messageFn: (node, value) => `Node ${node.name || node.id} contains env-specific literal "${value.substring(0, 40)}" (move to expression/credential)`,
  details: 'Move environment-specific URLs/IDs into expressions or credentials (e.g., {{$env.API_BASE_URL}}) so the workflow is portable.',
});
