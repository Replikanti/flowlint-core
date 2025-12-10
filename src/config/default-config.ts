// Types for FlowLint configuration

export interface RateLimitRetryConfig {
  enabled: boolean;
  max_concurrency?: number;
  default_retry?: { count: number; strategy: string; base_ms: number };
}

export interface ErrorHandlingConfig {
  enabled: boolean;
  forbid_continue_on_fail?: boolean;
}

export interface IdempotencyConfig {
  enabled: boolean;
  key_field_candidates?: string[];
}

export interface SecretsConfig {
  enabled: boolean;
  denylist_regex?: string[];
}

export interface DeadEndsConfig {
  enabled: boolean;
}

export interface LongRunningConfig {
  enabled: boolean;
  max_iterations?: number;
  timeout_ms?: number;
}

export interface UnusedDataConfig {
  enabled: boolean;
}

export interface UnhandledErrorPathConfig {
  enabled: boolean;
}

export interface AlertLogEnforcementConfig {
  enabled: boolean;
}

export interface DeprecatedNodesConfig {
  enabled: boolean;
}

export interface NamingConventionConfig {
  enabled: boolean;
  generic_names?: string[];
}

export interface ConfigLiteralsConfig {
  enabled: boolean;
  denylist_regex?: string[];
}

export interface WebhookAcknowledgmentConfig {
  enabled: boolean;
  heavy_node_types?: string[];
}

export interface RetryAfterComplianceConfig {
  enabled: boolean;
  suggest_exponential_backoff?: boolean;
  suggest_jitter?: boolean;
}

export interface RulesConfig {
  rate_limit_retry: RateLimitRetryConfig;
  error_handling: ErrorHandlingConfig;
  idempotency: IdempotencyConfig;
  secrets: SecretsConfig;
  dead_ends: DeadEndsConfig;
  long_running: LongRunningConfig;
  unused_data: UnusedDataConfig;
  unhandled_error_path: UnhandledErrorPathConfig;
  alert_log_enforcement: AlertLogEnforcementConfig;
  deprecated_nodes: DeprecatedNodesConfig;
  naming_convention: NamingConventionConfig;
  config_literals: ConfigLiteralsConfig;
  webhook_acknowledgment: WebhookAcknowledgmentConfig;
  retry_after_compliance: RetryAfterComplianceConfig;
}

export interface FilesConfig {
  include: string[];
  ignore: string[];
}

export interface ReportConfig {
  annotations: boolean;
  summary_limit: number;
}

export interface FlowLintConfig {
  files: FilesConfig;
  report: ReportConfig;
  rules: RulesConfig;
}

// Keep backward compatible type
export type RuleConfig = { enabled: boolean; [key: string]: unknown };

export const defaultConfig: FlowLintConfig = {
  files: {
    include: ['**/*.n8n.json', '**/workflows/*.json', '**/workflows/**/*.json', '**/*.n8n.yaml', '**/*.json'],
    ignore: [
      'samples/**',
      '**/*.spec.json',
      'node_modules/**',
      'package*.json',
      'tsconfig*.json',
      '.flowlint.yml',
      '.github/**',
      '.husky/**',
      '.vscode/**',
      'infra/**',
      '*.config.js',
      '*.config.ts',
      '**/*.lock',
    ],
  },
  report: { annotations: true, summary_limit: 25 },
  rules: {
    rate_limit_retry: {
      enabled: true,
      max_concurrency: 5,
      default_retry: { count: 3, strategy: 'exponential', base_ms: 500 },
    },
    error_handling: { enabled: true, forbid_continue_on_fail: true },
    idempotency: { enabled: true, key_field_candidates: ['eventId', 'messageId'] },
    secrets: { enabled: true, denylist_regex: ['(?i)api[_-]?key', 'Bearer '] },
    dead_ends: { enabled: true },
    long_running: { enabled: true, max_iterations: 1000, timeout_ms: 300000 },
    unused_data: { enabled: true },
    unhandled_error_path: { enabled: true },
    alert_log_enforcement: { enabled: true },
    deprecated_nodes: { enabled: true },
    naming_convention: {
      enabled: true,
      generic_names: ['http request', 'set', 'if', 'merge', 'switch', 'no-op', 'start'],
    },
    config_literals: {
      enabled: true,
      denylist_regex: [
        '(?i)\\b(dev|development)\\b',
        '(?i)\\b(stag|staging)\\b',
        '(?i)\\b(prod|production)\\b',
        '(?i)\\b(test|testing)\\b',
      ],
    },
    webhook_acknowledgment: {
      enabled: true,
      heavy_node_types: [
        'n8n-nodes-base.httpRequest',
        'n8n-nodes-base.postgres',
        'n8n-nodes-base.mysql',
        'n8n-nodes-base.mongodb',
        'n8n-nodes-base.openAi',
        'n8n-nodes-base.anthropic',
        'n8n-nodes-base.huggingFace',
      ],
    },
    retry_after_compliance: {
      enabled: true,
      suggest_exponential_backoff: true,
      suggest_jitter: true,
    },
  },
};
