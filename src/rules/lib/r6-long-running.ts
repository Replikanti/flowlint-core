import { readNumber } from '../../utils/utils';
import type { Graph, Finding } from '../../types';
import type { RuleContext } from '../index';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R6',
  name: 'long_running',
  severity: 'should',
  description: 'Flags workflows with potential for excessive runtime.',
  details: 'Detects loops with high iteration counts or long timeouts that could cause performance issues.',
};

export function r6LongRunning(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.long_running;
  if (!cfg?.enabled) return [];
  const findings: Finding[] = [];
  const loopNodes = graph.nodes.filter((node) => /loop|batch|while|repeat/i.test(node.type));

  for (const node of loopNodes) {
    const iterations = readNumber(node.params, [
      'maxIterations',
      'maxIteration',
      'limit',
      'options.maxIterations',
    ]);

    if (!iterations || (cfg.max_iterations && iterations > cfg.max_iterations)) {
      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path: ctx.path,
        message: `Node ${node.name || node.id} allows ${
          iterations ?? 'unbounded'
        } iterations (limit ${cfg.max_iterations}; set a lower cap)`,
        nodeId: node.id,
        line: ctx.nodeLines?.[node.id],
        raw_details: `Set Options > Max iterations to ≤ ${cfg.max_iterations} or split the processing into smaller batches.`,
      });
    }

    if (cfg.timeout_ms) {
      const timeout = readNumber(node.params, ['timeout', 'timeoutMs', 'options.timeout']);
      if (timeout && timeout > cfg.timeout_ms) {
          findings.push({
            rule: metadata.id,
            severity: metadata.severity,
            path: ctx.path,
            message: `Node ${node.name || node.id} uses timeout ${timeout}ms (limit ${
              cfg.timeout_ms
            }ms; shorten the timeout or break work apart)`,
          nodeId: node.id,
          line: ctx.nodeLines?.[node.id],
          raw_details: `Lower the timeout to ≤ ${cfg.timeout_ms}ms or split the workflow so no single step blocks for too long.`,
        });
      }
    }
  }

  return findings;
}
