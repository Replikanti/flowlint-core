import { createHardcodedStringRule } from '../rule-utils';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R4',
  name: 'secrets',
  severity: 'must',
  description: 'Detects hardcoded secrets, API keys, or credentials within node parameters.',
  details: 'All secrets should be stored securely using credential management systems.',
};

export const r4Secrets = createHardcodedStringRule({
  ruleId: metadata.id,
  severity: metadata.severity,
  configKey: 'secrets',
  messageFn: (node) => `Node ${node.name || node.id} contains a hardcoded secret (move it to credentials/env vars)`,
  details: 'Move API keys/tokens into Credentials or environment variables; the workflow should only reference {{$credentials.*}} expressions.',
});
