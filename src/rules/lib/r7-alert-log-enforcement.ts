import { isNotificationNode, isErrorHandlerNode, isRejoinNode } from '../../utils/utils';
import type { Graph, Finding } from '../../types';
import type { RuleContext } from '../index';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R7',
  name: 'alert_log_enforcement',
  severity: 'should',
  description: 'Ensures critical paths include logging or alerting steps.',
  details: 'For example, a failed payment processing branch should trigger an alert for monitoring.',
};

function isPathHandled(graph: Graph, startNodeId: string): boolean {
  const queue: string[] = [startNodeId];
  const visited = new Set<string>([startNodeId]);

  let head = 0;
  while (head < queue.length) {
    const currentId = queue[head++]!;
    const currentNode = graph.nodes.find((n) => n.id === currentId);

    if (!currentNode) continue;

    if (isNotificationNode(currentNode.type) || isErrorHandlerNode(currentNode.type, currentNode.name)) {
      return true;
    }

    if (isRejoinNode(graph, currentId)) {
      continue;
    }

    const outgoing = graph.edges.filter((e) => e.from === currentId);
    for (const outEdge of outgoing) {
      if (!visited.has(outEdge.to)) {
        visited.add(outEdge.to);
        queue.push(outEdge.to);
      }
    }
  }
  return false;
}

export function r7AlertLogEnforcement(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.alert_log_enforcement;
  if (!cfg?.enabled) return [];

  const findings: Finding[] = [];
  const errorEdges = graph.edges.filter((edge) => edge.on === 'error');

  for (const edge of errorEdges) {
    const fromNode = graph.nodes.find((n) => n.id === edge.from)!;
    if (!isPathHandled(graph, edge.to)) {
      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path: ctx.path,
        message: `Error path from node ${
          fromNode.name || fromNode.id
        } has no log/alert before rejoining (add notification node)`,
        nodeId: fromNode.id,
        line: ctx.nodeLines?.[fromNode.id],
        raw_details: 'Add a Slack/Email/Log node on the error branch before it rejoins the main flow so failures leave an audit trail.',
      });
    }
  }
  return findings;
}
