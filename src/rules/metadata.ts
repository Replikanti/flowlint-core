import { metadata as r1 } from './lib/r1-retry';
import { metadata as r2 } from './lib/r2-error-handling';
import { metadata as r3 } from './lib/r3-idempotency';
import { metadata as r4 } from './lib/r4-secrets';
import { metadata as r5 } from './lib/r5-dead-ends';
import { metadata as r6 } from './lib/r6-long-running';
import { metadata as r7 } from './lib/r7-alert-log-enforcement';
import { metadata as r8 } from './lib/r8-unused-data';
import { metadata as r9 } from './lib/r9-config-literals';
import { metadata as r10 } from './lib/r10-naming-convention';
import { metadata as r11 } from './lib/r11-deprecated-nodes';
import { metadata as r12 } from './lib/r12-unhandled-error-path';
import { metadata as r13 } from './lib/r13-webhook-acknowledgment';
import { metadata as r14 } from './lib/r14-retry-after-compliance';

export interface RuleMetadata {
  id: string;
  name: string;
  severity: 'must' | 'should' | 'nit';
  description: string;
  details: string;
}

export const RULES_METADATA: RuleMetadata[] = [
  r1,
  r2,
  r3,
  r4,
  r5,
  r6,
  r7,
  r8,
  r9,
  r10,
  r11,
  r12,
  r13,
  r14,
];






