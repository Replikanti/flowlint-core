import { createNodeRule } from '../rule-utils';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R11',
  name: 'deprecated_nodes',
  severity: 'should',
  description: 'Warns about deprecated node types and suggests alternatives.',
  details: 'Helps maintain workflows using current, supported node implementations.',
};

const DEPRECATED_NODES: Record<string, string> = {
  'n8n-nodes-base.splitInBatches': 'Use Loop over items instead',
  'n8n-nodes-base.executeWorkflow': 'Use Execute Workflow (Sub-Workflow) instead',
};

export const r11DeprecatedNodes = createNodeRule(metadata.id, metadata.name, (node, graph, ctx) => {
  if (DEPRECATED_NODES[node.type]) {
    return {
      rule: metadata.id,
      severity: metadata.severity,
      path: ctx.path,
      message: `Node ${node.name || node.id} uses deprecated type ${node.type} (replace with ${DEPRECATED_NODES[node.type]})`,
      nodeId: node.id,
      line: ctx.nodeLines?.[node.id],
      raw_details: `Replace this node with ${DEPRECATED_NODES[node.type]} so future n8n upgrades don’t break the workflow.`,
    };
  }
  return null;
});
