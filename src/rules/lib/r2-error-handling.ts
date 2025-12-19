import { createNodeRule } from '../rule-utils';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R2',
  name: 'error_handling',
  severity: 'must',
  description: 'Prevents the use of configurations that might hide errors.',
  details: 'Workflows should explicitly handle errors rather than ignoring them with continueOnFail: true.',
};

export const r2ErrorHandling = createNodeRule(metadata.id, metadata.name, (node, graph, ctx) => {
  if (ctx.cfg.rules.error_handling.forbid_continue_on_fail && node.flags?.continueOnFail) {
    return {
      rule: metadata.id,
      severity: metadata.severity,
      path: ctx.path,
      message: `Node ${node.name || node.id} has continueOnFail enabled (disable it and route errors explicitly)`,
      nodeId: node.id,
      line: ctx.nodeLines?.[node.id],
      raw_details:
        'Open the node in n8n and disable "Continue On Fail" (Options > Continue On Fail). Route failures down an explicit error branch instead.',
    };
  }
  return null;
});
