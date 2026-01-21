import type { Graph, Finding, RuleRunner } from '../types';
import type { FlowLintConfig } from '../config';

import { r1Retry } from './lib/r1-retry';
import { r2ErrorHandling } from './lib/r2-error-handling';
import { r3Idempotency } from './lib/r3-idempotency';
import { r4Secrets } from './lib/r4-secrets';
import { r5DeadEnds } from './lib/r5-dead-ends';
import { r6LongRunning } from './lib/r6-long-running';
import { r7AlertLogEnforcement } from './lib/r7-alert-log-enforcement';
import { r8UnusedData } from './lib/r8-unused-data';
import { r9ConfigLiterals } from './lib/r9-config-literals';
import { r10NamingConvention } from './lib/r10-naming-convention';
import { r11DeprecatedNodes } from './lib/r11-deprecated-nodes';
import { r12UnhandledErrorPath } from './lib/r12-unhandled-error-path';
import { r13WebhookAcknowledgment } from './lib/r13-webhook-acknowledgment';
import { r14RetryAfterCompliance } from './lib/r14-retry-after-compliance';

export type RuleContext = { path: string; cfg: FlowLintConfig; nodeLines?: Record<string, number> };

const rules: RuleRunner[] = [
  r1Retry,
  r2ErrorHandling,
  r3Idempotency,
  r4Secrets,
  r5DeadEnds,
  r6LongRunning,
  r7AlertLogEnforcement,
  r8UnusedData,
  r9ConfigLiterals,
  r10NamingConvention,
  r11DeprecatedNodes,
  r12UnhandledErrorPath,
  r13WebhookAcknowledgment,
  r14RetryAfterCompliance,
];

export function runAllRules(
  graph: Graph,
  ctx: RuleContext,
  extraRules: RuleRunner[] = [],
): Finding[] {
  return [...rules, ...extraRules].flatMap((rule) => rule(graph, ctx));
}

