import type { Graph, NodeRef } from '../types';

/**
 * Shared utility functions for workflow parsing and validation
 */


/**
 * Helper to flatten nested connection arrays from n8n workflow connections.
 * Connections can be nested in various ways (arrays of arrays, objects with node properties).
 * This recursively flattens them to a simple array of connection objects.
 *
 * @param value - The connection value to flatten (can be array, object, or primitive)
 * @returns Array of connection objects with 'node' property
 */
export function flattenConnections(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenConnections(entry));
  }
  if (typeof value === 'object' && 'node' in value) {
    return [value];
  }
  return [];
}

/**
 * Build validation error objects from a collection of items using provided templates.
 * This utility eliminates code duplication in validation error construction.
 *
 * @template T - Type of items to process
 * @param items - Set or array of items to convert to validation errors
 * @param errorConfig - Configuration object containing:
 *   - path: The JSON path where the error occurred
 *   - messageTemplate: Function to generate error message for each item
 *   - suggestionTemplate: Function to generate actionable suggestion for each item
 * @returns Array of validation error objects with path, message, and suggestion fields
 *
 * @example
 * ```typescript
 * const duplicates = new Set(['node1', 'node2']);
 * const errors = buildValidationErrors(duplicates, {
 *   path: 'nodes[].id',
 *   messageTemplate: (id) => `Duplicate node ID: "${id}"`, 
 *   suggestionTemplate: (id) => `Remove or rename the duplicate node with ID "${id}".`
 * });
 * ```
 */
export function buildValidationErrors<T>(
  items: Set<T> | T[],
  errorConfig: {
    path: string;
    messageTemplate: (item: T) => string;
    suggestionTemplate: (item: T) => string;
  }
): Array<{ path: string; message: string; suggestion: string }> {
  const itemArray = Array.isArray(items) ? items : Array.from(items);
  return itemArray.map((item) => ({
    path: errorConfig.path,
    message: errorConfig.messageTemplate(item),
    suggestion: errorConfig.suggestionTemplate(item),
  }));
}

export function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, out));
  else if (value && typeof value === 'object')
    Object.values(value).forEach((entry) => collectStrings(entry, out));
  return out;
}

export function toRegex(pattern: string): RegExp {
  let source = pattern;
  let flags = '';
  if (source.startsWith('(?i)')) {
    source = source.slice(4);
    flags += 'i';
  }
  return new RegExp(source, flags);
}

export function isApiNode(type: string) {
  return /http|request|google|facebook|ads/i.test(type);
}

export function isMutationNode(type: string) {
  return /write|insert|update|delete|post|put|patch|database|mongo|supabase|sheet/i.test(type);
}

export function isErrorProneNode(type: string) {
  return isApiNode(type) || isMutationNode(type) || /execute|workflow|function/i.test(type);
}

export function isNotificationNode(type: string) {
  return /slack|discord|email|gotify|mattermost|microsoftTeams|pushbullet|pushover|rocketchat|zulip|telegram/i.test(
    type,
  );
}

export function isErrorHandlerNode(type: string, name?: string) {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes('stopanderror')) return true;
  if (normalizedType.includes('errorhandler')) return true;
  if (normalizedType.includes('raiseerror')) return true;

  const normalizedName = name?.toLowerCase() ?? '';
  if (normalizedName.includes('stop and error')) return true;
  if (normalizedName.includes('error handler')) return true;

  return false;
}

export function isRejoinNode(graph: Graph, nodeId: string): boolean {
  const incoming = graph.edges.filter((e) => e.to === nodeId);
  if (incoming.length <= 1) return false;
  const hasErrorEdge = incoming.some((e) => e.on === 'error');
  const hasSuccessEdge = incoming.some((e) => e.on !== 'error');
  return hasErrorEdge && hasSuccessEdge;
}

export function isMeaningfulConsumer(node: NodeRef): boolean {
  // A meaningful consumer is a node that has an external side-effect.
  return (
    isMutationNode(node.type) || // Writes to a DB, sheet, etc.
    isNotificationNode(node.type) || // Sends a message to Slack, email, etc.
    isApiNode(node.type) || // Calls an external API
    /respondToWebhook/i.test(node.type) // Specifically nodes that send a response back.
  );
}

export function containsCandidate(value: unknown, candidates: string[]): boolean {
  if (!value || !candidates.length) return false;

  const queue: unknown[] = [value];
  const candidateRegex = new RegExp(`(${candidates.join('|')})`, 'i');

  while (queue.length > 0) {
    const current = queue.shift();

    if (typeof current === 'string') {
      if (candidateRegex.test(current)) return true;
    } else if (Array.isArray(current)) {
      queue.push(...current);
    } else if (current && typeof current === 'object') {
      for (const [key, val] of Object.entries(current)) {
        if (candidateRegex.test(key)) return true;
        queue.push(val);
      }
    }
  }

  return false;
}

const TERMINAL_NODE_PATTERNS = [
  'respond', 'reply', 'end', 'stop', 'terminate', 'return', 'sticky', 'note', 'noop', 'no operation',
  'slack', 'email', 'discord', 'teams', 'webhook', 'telegram', 'pushbullet', 'mattermost', 'notifier', 'notification', 'alert', 'sms', 'call',
];

export function isTerminalNode(type: string, name?: string) {
  const label = `${type} ${name ?? ''}`.toLowerCase();
  return TERMINAL_NODE_PATTERNS.some((pattern) => label.includes(pattern));
}

export function readNumber(source: any, paths: string[]): number | undefined {
  for (const path of paths) {
    const value = path.split('.').reduce<any>((acc, key) => (acc ? acc[key] : undefined), source);
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && !Number.isNaN(Number(value))) return Number(value);
  }
  return undefined;
}

export function findAllDownstreamNodes(graph: Graph, startNodeId: string): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  visited.add(startNodeId);

  let head = 0;
  while (head < queue.length) {
    const currentId = queue[head++]!;
    const outgoing = graph.edges.filter((e) => e.from === currentId);
    for (const edge of outgoing) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return visited;
}

export function findAllUpstreamNodes(graph: Graph, startNodeId: string): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  visited.add(startNodeId);

  let head = 0;
  while (head < queue.length) {
    const currentId = queue[head++]!;
    const incoming = graph.edges.filter((e) => e.to === currentId);
    for (const edge of incoming) {
      if (!visited.has(edge.from)) {
        visited.add(edge.from);
        queue.push(edge.from);
      }
    }
  }
  return visited;
}

export const EXAMPLES_BASE_URL = "https://github.com/Replikanti/flowlint-examples/tree/main";

export function getExampleLink(ruleId: string): string {
  return `${EXAMPLES_BASE_URL}/${ruleId}`;
}

