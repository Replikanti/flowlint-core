import { createNodeRule } from '../rule-utils';
import { isApiNode } from '../../utils/utils';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R1',
  name: 'rate_limit_retry',
  severity: 'must',
  description: 'Ensures that nodes making external API calls have a retry mechanism configured.',
  details: 'Critical for building resilient workflows that can handle transient network issues or temporary service unavailability.',
};

export const r1Retry = createNodeRule(metadata.id, metadata.name, (node, graph, ctx) => {
  if (!isApiNode(node.type)) return null;

  const params = (node.params ?? {});
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

  return {
    rule: metadata.id,
    severity: metadata.severity,
    path: ctx.path,
    message: `Node ${node.name || node.id} is missing retry/backoff configuration`,
    raw_details: `In the node properties, enable "Retry on Fail" under Options.`,
    nodeId: node.id,
    line: ctx.nodeLines?.[node.id],
  };
});
