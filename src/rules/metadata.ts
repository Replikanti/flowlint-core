export interface RuleMetadata {
  id: string;
  name: string;
  severity: 'must' | 'should' | 'nit';
  description: string;
  details: string;
}

const rules: [string, string, RuleMetadata['severity'], string, string][] = [
  [
    'R1',
    'rate_limit_retry',
    'must',
    'Ensures that nodes making external API calls have a retry mechanism configured.',
    'Critical for building resilient workflows that can handle transient network issues or temporary service unavailability.',
  ],
  [
    'R2',
    'error_handling',
    'must',
    'Prevents the use of configurations that might hide errors.',
    'Workflows should explicitly handle errors rather than ignoring them with continueOnFail: true.',
  ],
  [
    'R3',
    'idempotency',
    'should',
    'Guards against operations that are not idempotent with retries configured.',
    'Detects patterns where a webhook trigger could lead to duplicate processing in databases or external services.',
  ],
  [
    'R4',
    'secrets',
    'must',
    'Detects hardcoded secrets, API keys, or credentials within node parameters.',
    'All secrets should be stored securely using credential management systems.',
  ],
  [
    'R5',
    'dead_ends',
    'should',
    'Finds nodes or workflow branches not connected to any other node.',
    'Indicates incomplete or dead logic that should be reviewed or removed.',
  ],
  [
    'R6',
    'long_running',
    'should',
    'Flags workflows with potential for excessive runtime.',
    'Detects loops with high iteration counts or long timeouts that could cause performance issues.',
  ],
  [
    'R7',
    'alert_log_enforcement',
    'should',
    'Ensures critical paths include logging or alerting steps.',
    'For example, a failed payment processing branch should trigger an alert for monitoring.',
  ],
  [
    'R8',
    'unused_data',
    'nit',
    'Detects when node output data is not consumed by subsequent nodes.',
    'Identifies unnecessary data processing that could be optimized or removed.',
  ],
  [
    'R9',
    'config_literals',
    'should',
    'Flags hardcoded literals (URLs, environment tags, tenant IDs) that should come from configuration.',
    'Promotes externalized configuration and prevents hardcoded environment-specific values.',
  ],
  [
    'R10',
    'naming_convention',
    'nit',
    'Enforces consistent and descriptive naming for nodes.',
    'Improves workflow readability and maintainability (e.g., \'Fetch Customer Data from CRM\' vs \'HTTP Request\').',
  ],
  [
    'R11',
    'deprecated_nodes',
    'should',
    'Warns about deprecated node types and suggests alternatives.',
    'Helps maintain workflows using current, supported node implementations.',
  ],
  [
    'R12',
    'unhandled_error_path',
    'must',
    'Ensures nodes with error outputs have connected error handling branches.',
    'Prevents silent failures by requiring explicit error path handling.',
  ],
  [
    'R13',
    'webhook_acknowledgment',
    'must',
    'Detects webhooks performing heavy processing without immediate acknowledgment.',
    'Prevents timeout and duplicate events by requiring \'Respond to Webhook\' node before heavy operations (HTTP requests, database queries, AI/LLM calls).',
  ],
  [
    'R14',
    'retry_after_compliance',
    'should',
    'Detects HTTP nodes with retry logic that ignore Retry-After headers from 429/503 responses.',
    'APIs return Retry-After headers (seconds or HTTP date) to indicate when to retry. Ignoring these causes aggressive retry storms, wasted attempts, and potential API bans. Respecting server guidance prevents IP blocking and extended backoffs.',
  ],
];

export const RULES_METADATA: RuleMetadata[] = rules.map(
  ([id, name, severity, description, details]) => ({
    id,
    name,
    severity,
    description,
    details,
  }),
);




