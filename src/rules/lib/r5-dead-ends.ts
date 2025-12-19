import { isTerminalNode } from '../../utils/utils';
import type { Graph, Finding } from '../../types';
import type { RuleContext } from '../index';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R5',
  name: 'dead_ends',
  severity: 'should',
  description: 'Finds nodes or workflow branches not connected to any other node.',
  details: 'Indicates incomplete or dead logic that should be reviewed or removed.',
};

export function r5DeadEnds(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.dead_ends;
  if (!cfg?.enabled) return [];
  if (graph.nodes.length <= 1) return [];

  const outgoing = new Map<string, number>();
  for (const node of graph.nodes) outgoing.set(node.id, 0);
  for (const edge of graph.edges) outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);

  const findings: Finding[] = [];

  for (const node of graph.nodes) {
    if ((outgoing.get(node.id) || 0) === 0 && !isTerminalNode(node.type, node.name)) {
      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path: ctx.path,
        message: `Node ${node.name || node.id} has no outgoing connections (either wire it up or remove it)`,
        nodeId: node.id,
        line: ctx.nodeLines?.[node.id],
        raw_details: 'Either remove this node as dead code or connect it to the next/safe step so the workflow can continue.',
      });
    }
  }
  return findings;
}
