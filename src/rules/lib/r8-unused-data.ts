import { isTerminalNode, isMeaningfulConsumer, findAllDownstreamNodes } from '../../utils/utils';
import type { Graph, Finding } from '../../types';
import type { RuleContext } from '../index';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R8',
  name: 'unused_data',
  severity: 'nit',
  description: 'Detects when node output data is not consumed by subsequent nodes.',
  details: 'Identifies unnecessary data processing that could be optimized or removed.',
};

export function r8UnusedData(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.unused_data;
  if (!cfg?.enabled) return [];

  const findings: Finding[] = [];
  for (const node of graph.nodes) {
    // If a node has no successors, R5 handles it. If it's a terminal node, its "use" is to end the flow.
    if (isTerminalNode(node.type, node.name) || !graph.edges.some((e) => e.from === node.id)) {
      continue;
    }

    const downstreamNodes = findAllDownstreamNodes(graph, node.id);
    downstreamNodes.delete(node.id);

    const leadsToConsumer = [...downstreamNodes].some((id) => {
      const downstreamNode = graph.nodes.find((n) => n.id === id)!;
      return isMeaningfulConsumer(downstreamNode);
    });

    if (!leadsToConsumer) {
      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path: ctx.path,
        message: `Node "${node.name || node.id}" produces data that never reaches any consumer`,
        nodeId: node.id,
        line: ctx.nodeLines?.[node.id],
        raw_details: 'Wire this branch into a consumer (DB/API/response) or remove it—otherwise the data produced here is never used.',
      });
    }
  }
  return findings;
}
