import type { Graph, Finding, NodeRef } from '../types';
import type { FlowLintConfig } from '../config';
import { createNodeRule, createHardcodedStringRule } from './rule-utils';
import { RULES_METADATA } from './metadata';
import {
  isApiNode,
  isMutationNode,
  isErrorProneNode,
  isNotificationNode,
  isErrorHandlerNode,
  isRejoinNode,
  isMeaningfulConsumer,
  isTerminalNode,
  readNumber,
  findAllDownstreamNodes,
  findAllUpstreamNodes,
  containsCandidate,
} from '../utils/utils';

type RuleContext = { path: string; cfg: FlowLintConfig; nodeLines?: Record<string, number> };

type RuleRunner = (graph: Graph, ctx: RuleContext) => Finding[];

const getRuleMeta = (id: string) => {
  const meta = RULES_METADATA.find((r) => r.id === id);
  if (!meta) throw new Error(`Metadata for rule ${id} not found`);
  return meta;
};

// --- Rule Definitions using Helpers ---

const r1Retry = createNodeRule('R1', 'rate_limit_retry', (node, graph, ctx) => {
  if (!isApiNode(node.type)) return null;

  const params = (node.params ?? {}) as Record<string, unknown>;
  const options = ((params as any).options ?? {}) as Record<string, unknown>;

  const retryCandidates: unknown[] = [
    options.retryOnFail,
    (params as any).retryOnFail,
    node.flags?.retryOnFail,
  ];

  const retryOnFail = retryCandidates.find((value) => value !== undefined && value !== null);

  if (retryOnFail === true) {
    return null;
  }

  if (typeof retryOnFail === 'string') {
    const normalized = retryOnFail.trim().toLowerCase();
    if (retryOnFail.includes('{{') || normalized === 'true') {
      return null;
    }
  }

  const meta = getRuleMeta('R1');
  return {
    rule: 'R1',
    severity: meta.severity,
    path: ctx.path,
    message: `Node ${node.name || node.id} is missing retry/backoff configuration`,
    raw_details: `In the node properties, enable "Retry on Fail" under Options.`,
    nodeId: node.id,
    line: ctx.nodeLines?.[node.id],
  };
});

const r2ErrorHandling = createNodeRule('R2', 'error_handling', (node, graph, ctx) => {
  if (ctx.cfg.rules.error_handling.forbid_continue_on_fail && node.flags?.continueOnFail) {
    const meta = getRuleMeta('R2');
    return {
      rule: 'R2',
      severity: meta.severity,
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

const r4Secrets = createHardcodedStringRule({
  ruleId: 'R4',
  severity: getRuleMeta('R4').severity,
  configKey: 'secrets',
  messageFn: (node) => `Node ${node.name || node.id} contains a hardcoded secret (move it to credentials/env vars)`,
  details: 'Move API keys/tokens into Credentials or environment variables; the workflow should only reference {{$credentials.*}} expressions.',
});

const r9ConfigLiterals = createHardcodedStringRule({
  ruleId: 'R9',
  severity: getRuleMeta('R9').severity,
  configKey: 'config_literals',
  messageFn: (node, value) => `Node ${node.name || node.id} contains env-specific literal "${value.substring(0, 40)}" (move to expression/credential)`,
  details: 'Move environment-specific URLs/IDs into expressions or credentials (e.g., {{$env.API_BASE_URL}}) so the workflow is portable.',
});

const r10NamingConvention = createNodeRule('R10', 'naming_convention', (node, graph, ctx) => {
  const genericNames = new Set(ctx.cfg.rules.naming_convention.generic_names ?? []);
  if (!node.name || genericNames.has(node.name.toLowerCase())) {
    const meta = getRuleMeta('R10');
    return {
      rule: 'R10',
      severity: meta.severity,
      path: ctx.path,
      message: `Node ${node.id} uses a generic name "${node.name ?? ''}" (rename it to describe the action)`,
      nodeId: node.id,
      line: ctx.nodeLines?.[node.id],
      raw_details: 'Rename the node to describe its purpose (e.g., "Check subscription status" instead of "IF") for easier reviews and debugging.',
    };
  }
  return null;
});

const DEPRECATED_NODES: Record<string, string> = {
  'n8n-nodes-base.splitInBatches': 'Use Loop over items instead',
  'n8n-nodes-base.executeWorkflow': 'Use Execute Workflow (Sub-Workflow) instead',
};

const r11DeprecatedNodes = createNodeRule('R11', 'deprecated_nodes', (node, graph, ctx) => {
  if (DEPRECATED_NODES[node.type]) {
    const meta = getRuleMeta('R11');
    return {
      rule: 'R11',
      severity: meta.severity,
      path: ctx.path,
      message: `Node ${node.name || node.id} uses deprecated type ${node.type} (replace with ${DEPRECATED_NODES[node.type]})`,
      nodeId: node.id,
      line: ctx.nodeLines?.[node.id],
      raw_details: `Replace this node with ${DEPRECATED_NODES[node.type]} so future n8n upgrades donâ€™t break the workflow.`,
    };
  }
  return null;
});

const r12UnhandledErrorPath = createNodeRule('R12', 'unhandled_error_path', (node, graph, ctx) => {
  if (!isErrorProneNode(node.type)) return null;

  const hasErrorPath = graph.edges.some((edge) => {
    if (edge.from !== node.id) return false;
    if (edge.on === 'error') return true;

    const targetNode = graph.nodes.find((candidate) => candidate.id === edge.to);
    return targetNode ? isErrorHandlerNode(targetNode.type, targetNode.name) : false;
  });

  if (!hasErrorPath) {
    const meta = getRuleMeta('R12');
    return {
      rule: 'R12',
      severity: meta.severity,
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

function r13WebhookAcknowledgment(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.webhook_acknowledgment;
  if (!cfg?.enabled) return [];

  const findings: Finding[] = [];
  const meta = getRuleMeta('R13');

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
        rule: 'R13',
        severity: meta.severity,
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

const r14RetryAfterCompliance = createNodeRule('R14', 'retry_after_compliance', (node, graph, ctx) => {
  // Only check HTTP request nodes
  if (!isApiNode(node.type)) return null;

  const params = (node.params ?? {}) as Record<string, unknown>;
  const options = ((params as any).options ?? {}) as Record<string, unknown>;

  // Check if retry is enabled
  const retryCandidates: unknown[] = [
    options.retryOnFail,
    (params as any).retryOnFail,
    node.flags?.retryOnFail,
  ];

  const retryOnFail = retryCandidates.find((value) => value !== undefined && value !== null);

  // If retry is disabled or explicitly false, skip this rule
  if (!retryOnFail || retryOnFail === false) return null;

  // If retryOnFail is explicitly a string expression, skip if it's not "true"
  if (typeof retryOnFail === 'string') {
    const normalized = retryOnFail.trim().toLowerCase();
    if (retryOnFail.includes('{{') && normalized !== 'true') {
      return null; // Dynamic expression, assume it might handle retry-after
    }
  }

  // Check waitBetweenTries specifically (Pragmatic fix for n8n UI limitations)
  const waitBetweenTries = node.flags?.waitBetweenTries;
  if (waitBetweenTries !== undefined && waitBetweenTries !== null) {
    // If it's a static number (or numeric string), we accept it because n8n UI
    // often prevents using expressions here. We prioritize allowing retries (R1)
    // over strict Retry-After compliance if the platform limits the user.
    if (typeof waitBetweenTries === 'number') return null;
    if (
      typeof waitBetweenTries === 'string' &&
      !isNaN(Number(waitBetweenTries)) &&
      !waitBetweenTries.includes('{{')
    ) {
      return null;
    }
  }

  // Check if there's an expression/code that references retry-after
  const nodeStr = JSON.stringify(node);
  const hasRetryAfterLogic = /retry[-_]?after|retryafter/i.test(nodeStr);

  if (hasRetryAfterLogic) {
    return null; // Good - respects Retry-After
  }

  const meta = getRuleMeta('R14');
  // Flag as violation
  return {
    rule: 'R14',
    severity: meta.severity,
    path: ctx.path,
    message: `Node ${node.name || node.id} has retry logic but ignores Retry-After headers (429/503 responses)`,
    raw_details: `Add expression to parse Retry-After header: const retryAfter = $json.headers['retry-after']; const delay = retryAfter ? (parseInt(retryAfter) || new Date(retryAfter) - Date.now()) : Math.min(1000 * Math.pow(2, $execution.retryCount), 60000); This prevents API bans and respects server rate limits.`,
    nodeId: node.id,
    line: ctx.nodeLines?.[node.id],
  };
});


// --- Rules with custom logic (not fitting the simple node-by-node pattern) ---

function r3Idempotency(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.idempotency;
  if (!cfg?.enabled) return [];

  const hasIngress = graph.nodes.some((node) => /webhook|trigger|start/i.test(node.type));
  if (!hasIngress) return [];

  const mutationNodes = graph.nodes.filter((node) => isMutationNode(node.type));
  if (!mutationNodes.length) return [];

  const findings: Finding[] = [];
  const meta = getRuleMeta('R3');

  for (const mutationNode of mutationNodes) {
    const upstreamNodeIds = findAllUpstreamNodes(graph, mutationNode.id);
    const upstreamNodes = graph.nodes.filter((n) => upstreamNodeIds.has(n.id));

    const hasGuard = upstreamNodes.some((p) =>
      containsCandidate(p.params, cfg.key_field_candidates ?? []),
    );

    if (!hasGuard) {
      findings.push({
        rule: 'R3',
        severity: meta.severity,
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

function r5DeadEnds(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.dead_ends;
  if (!cfg?.enabled) return [];
  if (graph.nodes.length <= 1) return [];

  const outgoing = new Map<string, number>();
  for (const node of graph.nodes) outgoing.set(node.id, 0);
  for (const edge of graph.edges) outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);

  const findings: Finding[] = [];
  const meta = getRuleMeta('R5');

  for (const node of graph.nodes) {
    if ((outgoing.get(node.id) || 0) === 0 && !isTerminalNode(node.type, node.name)) {
      findings.push({
        rule: 'R5',
        severity: meta.severity,
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

function r6LongRunning(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.long_running;
  if (!cfg?.enabled) return [];
  const findings: Finding[] = [];
  const meta = getRuleMeta('R6');
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
        rule: 'R6',
        severity: meta.severity,
        path: ctx.path,
        message: `Node ${node.name || node.id} allows ${
          iterations ?? 'unbounded'
        } iterations (limit ${cfg.max_iterations}; set a lower cap)`,
        nodeId: node.id,
        line: ctx.nodeLines?.[node.id],
        raw_details: `Set Options > Max iterations to â‰¤ ${cfg.max_iterations} or split the processing into smaller batches.`,
      });
    }

    if (cfg.timeout_ms) {
      const timeout = readNumber(node.params, ['timeout', 'timeoutMs', 'options.timeout']);
      if (timeout && timeout > cfg.timeout_ms) {
          findings.push({
            rule: 'R6',
            severity: meta.severity,
            path: ctx.path,
            message: `Node ${node.name || node.id} uses timeout ${timeout}ms (limit ${
              cfg.timeout_ms
            }ms; shorten the timeout or break work apart)`,
          nodeId: node.id,
          line: ctx.nodeLines?.[node.id],
          raw_details: `Lower the timeout to â‰¤ ${cfg.timeout_ms}ms or split the workflow so no single step blocks for too long.`,
        });
      }
    }
  }

  return findings;
}

function r7AlertLogEnforcement(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.alert_log_enforcement;
  if (!cfg?.enabled) return [];

  const findings: Finding[] = [];
  const meta = getRuleMeta('R7');
  const errorEdges = graph.edges.filter((edge) => edge.on === 'error');

  for (const edge of errorEdges) {
    const fromNode = graph.nodes.find((n) => n.id === edge.from)!;
    let isHandled = false;
    const queue: string[] = [edge.to];
    const visited = new Set<string>([edge.to]);

    let head = 0;
    while (head < queue.length) {
      const currentId = queue[head++]!;
      const currentNode = graph.nodes.find((n) => n.id === currentId)!;

      if (isNotificationNode(currentNode.type) || isErrorHandlerNode(currentNode.type, currentNode.name)) {
        isHandled = true;
        break; // Found a handler, stop searching this path
      }

      if (isRejoinNode(graph, currentId)) {
        continue; // It's a rejoin point, but not a handler, so stop traversing this path
      }

      // Add successors to queue
      const outgoing = graph.edges.filter((e) => e.from === currentId);
      for (const outEdge of outgoing) {
        if (!visited.has(outEdge.to)) {
          visited.add(outEdge.to);
          queue.push(outEdge.to);
        }
      }
    }

    if (!isHandled) {
      findings.push({
        rule: 'R7',
        severity: meta.severity,
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

function r8UnusedData(graph: Graph, ctx: RuleContext): Finding[] {
  const cfg = ctx.cfg.rules.unused_data;
  if (!cfg?.enabled) return [];

  const findings: Finding[] = [];
  const meta = getRuleMeta('R8');
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
        rule: 'R8',
        severity: meta.severity,
        path: ctx.path,
        message: `Node "${node.name || node.id}" produces data that never reaches any consumer`,
        nodeId: node.id,
        line: ctx.nodeLines?.[node.id],
        raw_details: 'Wire this branch into a consumer (DB/API/response) or remove itâ€”otherwise the data produced here is never used.',
      });
    }
  }
  return findings;
}

// --- Rule Registration ---

const rules: RuleRunner[] = [
  r1Retry,
  r2ErrorHandling,
  r3Idempotency,
  r4Secrets,
  r5DeadEnds,
  r6LongRunning,
  r7AlertLogEnforcement,
  r8UnusedData,
  r9ConfigLiterals,
  r10NamingConvention,
  r11DeprecatedNodes,
  r12UnhandledErrorPath,
  r13WebhookAcknowledgment,
  r14RetryAfterCompliance,
];

export function runAllRules(graph: Graph, ctx: RuleContext): Finding[] {
  return rules.flatMap((rule) => rule(graph, ctx));
}

