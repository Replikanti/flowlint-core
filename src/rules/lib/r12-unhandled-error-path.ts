import { createNodeRule } from '../rule-utils';
import { isErrorProneNode, isErrorHandlerNode } from '../../utils/utils';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R12',
  name: 'unhandled_error_path',
  severity: 'must',
  description: 'Ensures nodes with error outputs have connected error handling branches.',
  details: 'Prevents silent failures by requiring explicit error path handling.',
};

export const r12UnhandledErrorPath = createNodeRule(metadata.id, metadata.name, (node, graph, ctx) => {
  if (!isErrorProneNode(node.type)) return null;

  const hasErrorPath = graph.edges.some((edge) => {
    if (edge.from !== node.id) return false;
    if (edge.on === 'error') return true;

    const targetNode = graph.nodes.find((candidate) => candidate.id === edge.to);
    return targetNode ? isErrorHandlerNode(targetNode.type, targetNode.name) : false;
  });

  if (!hasErrorPath) {
    return {
      rule: metadata.id,
      severity: metadata.severity,
      path: ctx.path,
      message: `Node ${node.name || node.id} has no error branch (add a red connector to handler)`,
      nodeId: node.id,
      line: ctx.nodeLines?.[node.id],
      raw_details:
        'Add an error (red) branch to a Stop and Error or logging/alert node so failures do not disappear silently.',
    };
  }
  return null;
});
