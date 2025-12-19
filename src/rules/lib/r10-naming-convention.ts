import { createNodeRule } from '../rule-utils';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R10',
  name: 'naming_convention',
  severity: 'nit',
  description: 'Enforces consistent and descriptive naming for nodes.',
  details: "Enforces consistent and descriptive naming for nodes. Improves workflow readability and maintainability (e.g., 'Fetch Customer Data from CRM' vs 'HTTP Request').",
};

export const r10NamingConvention = createNodeRule(metadata.id, metadata.name, (node, graph, ctx) => {
  const genericNames = new Set(ctx.cfg.rules.naming_convention.generic_names ?? []);
  if (!node.name || genericNames.has(node.name.toLowerCase())) {
    return {
      rule: metadata.id,
      severity: metadata.severity,
      path: ctx.path,
      message: `Node ${node.id} uses a generic name "${node.name ?? ''}" (rename it to describe the action)`,
      nodeId: node.id,
      line: ctx.nodeLines?.[node.id],
      raw_details: 'Rename the node to describe its purpose (e.g., "Check subscription status" instead of "IF") for easier reviews and debugging.',
    };
  }
  return null;
});
