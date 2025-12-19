import { isMutationNode, findAllUpstreamNodes, containsCandidate } from '../../utils/utils';
import type { Graph, Finding } from '../../types';
import type { RuleContext } from '../index';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R3',
  name: 'idempotency',
  severity: 'should',
  description: 'Guards against operations that are not idempotent with retries configured.',
  details: 'Detects patterns where a webhook trigger could lead to duplicate processing in databases or external services.',
};

export function r3Idempotency(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.idempotency;
  if (!cfg?.enabled) return [];

  const hasIngress = graph.nodes.some((node) => /webhook|trigger|start/i.test(node.type));
  if (!hasIngress) return [];

  const mutationNodes = graph.nodes.filter((node) => isMutationNode(node.type));
  if (!mutationNodes.length) return [];

  const findings: Finding[] = [];

  for (const mutationNode of mutationNodes) {
    const upstreamNodeIds = findAllUpstreamNodes(graph, mutationNode.id);
    const upstreamNodes = graph.nodes.filter((n) => upstreamNodeIds.has(n.id));

    const hasGuard = upstreamNodes.some((p) =>
      containsCandidate(p.params, cfg.key_field_candidates ?? []),
    );

    if (!hasGuard) {
      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path: ctx.path,
        message: `The mutation path ending at "${
          mutationNode.name || mutationNode.id
        }" appears to be missing an idempotency guard.`,
        raw_details: `Ensure one of the upstream nodes or the mutation node itself uses an idempotency key, such as one of: ${(cfg.key_field_candidates ?? []).join(
          ', ',
        )}`,
        nodeId: mutationNode.id,
        line: ctx.nodeLines?.[mutationNode.id],
      });
    }
  }

  return findings;
}
