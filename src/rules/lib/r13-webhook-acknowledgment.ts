import type { Graph, Finding, NodeRef } from '../../types';
import type { RuleContext } from '../index';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R13',
  name: 'webhook_acknowledgment',
  severity: 'must',
  description: 'Detects webhooks performing heavy processing without immediate acknowledgment.',
  details: "Prevents timeout and duplicate events by requiring 'Respond to Webhook' node before heavy operations (HTTP requests, database queries, AI/LLM calls).",
};

export function r13WebhookAcknowledgment(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.webhook_acknowledgment;
  if (!cfg?.enabled) return [];

  const findings: Finding[] = [];

  // Find all webhook trigger nodes (not respondToWebhook)
  const webhookNodes = graph.nodes.filter((node) =>
    node.type === 'n8n-nodes-base.webhook' ||
    (node.type.includes('webhook') && !node.type.includes('respondToWebhook'))
  );

  for (const webhookNode of webhookNodes) {
    // Get immediate downstream nodes
    const directDownstream = graph.edges
      .filter((edge) => edge.from === webhookNode.id)
      .map((edge) => graph.nodes.find((n) => n.id === edge.to))
      .filter((n): n is NodeRef => !!n);

    if (directDownstream.length === 0) continue;

    // Check if first downstream is "Respond to Webhook"
    const hasImmediateResponse = directDownstream.some((node) =>
      node.type === 'n8n-nodes-base.respondToWebhook' ||
      /respond.*webhook/i.test(node.type) ||
      /respond.*webhook/i.test(node.name || '')
    );

    if (hasImmediateResponse) continue; // Good pattern - immediate acknowledgment

    // Check if any downstream node is "heavy"
    const heavyNodeTypes = cfg.heavy_node_types || [
      'n8n-nodes-base.httpRequest',
      'n8n-nodes-base.postgres',
      'n8n-nodes-base.mysql',
      'n8n-nodes-base.mongodb',
      'n8n-nodes-base.openAi',
      'n8n-nodes-base.anthropic',
    ];

    const hasHeavyProcessing = directDownstream.some((node) =>
      heavyNodeTypes.includes(node.type) || /loop|batch/i.test(node.type)
    );

    if (hasHeavyProcessing) {
      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path: ctx.path,
        message: `Webhook "${webhookNode.name || webhookNode.id}" performs heavy processing before acknowledgment (risk of timeout/duplicates)`,
        nodeId: webhookNode.id,
        line: ctx.nodeLines?.[webhookNode.id],
        raw_details: `Add a "Respond to Webhook" node immediately after the webhook trigger (return 200/204), then perform heavy processing. This prevents webhook timeouts and duplicate events.`,
      });
    }
  }

  return findings;
}
