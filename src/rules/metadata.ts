export interface RuleMetadata {
  id: string;
  name: string;
  severity: 'must' | 'should' | 'nit';
  description: string;
  details: string;
}

export const RULES_METADATA: RuleMetadata[] = [
  {
    id: 'R1',
    name: 'rate_limit_retry',
    severity: 'must',
    description: 'Ensures that nodes making external API calls have a retry mechanism configured.',
    details: 'Critical for building resilient workflows that can handle transient network issues or temporary service unavailability.',
  },
  {
    id: 'R2',
    name: 'error_handling',
    severity: 'must',
    description: 'Prevents the use of configurations that might hide errors.',
    details: 'Workflows should explicitly handle errors rather than ignoring them with continueOnFail: true.',
  },
  {
    id: 'R3',
    name: 'idempotency',
    severity: 'should',
    description: 'Guards against operations that are not idempotent with retries configured.',
    details: 'Detects patterns where a webhook trigger could lead to duplicate processing in databases or external services.',
  },
  {
    id: 'R4',
    name: 'secrets',
    severity: 'must',
    description: 'Detects hardcoded secrets, API keys, or credentials within node parameters.',
    details: 'All secrets should be stored securely using credential management systems.',
  },
  {
    id: 'R5',
    name: 'dead_ends',
    severity: 'should',
    description: 'Finds nodes or workflow branches not connected to any other node.',
    details: 'Indicates incomplete or dead logic that should be reviewed or removed.',
  },
  {
    id: 'R6',
    name: 'long_running',
    severity: 'should',
    description: 'Flags workflows with potential for excessive runtime.',
    details: 'Detects loops with high iteration counts or long timeouts that could cause performance issues.',
  },
  {
    id: 'R7',
    name: 'alert_log_enforcement',
    severity: 'should',
    description: 'Ensures critical paths include logging or alerting steps.',
    details: 'For example, a failed payment processing branch should trigger an alert for monitoring.',
  },
  {
    id: 'R8',
    name: 'unused_data',
    severity: 'nit',
    description: 'Detects when node output data is not consumed by subsequent nodes.',
    details: 'Identifies unnecessary data processing that could be optimized or removed.',
  },
  {
    id: 'R9',
    name: 'config_literals',
    severity: 'should',
    description: 'Flags hardcoded literals (URLs, environment tags, tenant IDs) that should come from configuration.',
    details: 'Promotes externalized configuration and prevents hardcoded environment-specific values.',
  },
  {
    id: 'R10',
    name: 'naming_convention',
    severity: 'nit',
    description: 'Enforces consistent and descriptive naming for nodes.',
    details: "Improves workflow readability and maintainability (e.g., 'Fetch Customer Data from CRM' vs 'HTTP Request').",
  },
  {
    id: 'R11',
    name: 'deprecated_nodes',
    severity: 'should',
    description: 'Warns about deprecated node types and suggests alternatives.',
    details: 'Helps maintain workflows using current, supported node implementations.',
  },
  {
    id: 'R12',
    name: 'unhandled_error_path',
    severity: 'must',
    description: 'Ensures nodes with error outputs have connected error handling branches.',
    details: 'Prevents silent failures by requiring explicit error path handling.',
  },
  {
    id: 'R13',
    name: 'webhook_acknowledgment',
    severity: 'must',
    description: 'Detects webhooks performing heavy processing without immediate acknowledgment.',
    details: "Prevents timeout and duplicate events by requiring 'Respond to Webhook' node before heavy operations (HTTP requests, database queries, AI/LLM calls).",
  },
  {
    id: 'R14',
    name: 'retry_after_compliance',
    severity: 'should',
    description: 'Detects HTTP nodes with retry logic that ignore Retry-After headers from 429/503 responses.',
    details: 'APIs return Retry-After headers (seconds or HTTP date) to indicate when to retry. Ignoring these causes aggressive retry storms, wasted attempts, and potential API bans. Respecting server guidance prevents IP blocking and extended backoffs.',
  },
];
