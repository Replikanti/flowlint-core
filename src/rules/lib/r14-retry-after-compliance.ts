import { createNodeRule } from '../rule-utils';
import { isApiNode } from '../../utils/utils';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R14',
  name: 'retry_after_compliance',
  severity: 'should',
  description: 'Detects HTTP nodes with retry logic that ignore Retry-After headers from 429/503 responses.',
  details: 'APIs return Retry-After headers (seconds or HTTP date) to indicate when to retry. Ignoring these causes aggressive retry storms, wasted attempts, and potential API bans. Respecting server guidance prevents IP blocking and extended backoffs.',
};

export const r14RetryAfterCompliance = createNodeRule(metadata.id, metadata.name, (node, graph, ctx) => {
  // Only check HTTP request nodes
  if (!isApiNode(node.type)) return null;

  const params = (node.params ?? {});
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
      !Number.isNaN(Number(waitBetweenTries)) &&
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

  // Flag as violation
  return {
    rule: metadata.id,
    severity: metadata.severity,
    path: ctx.path,
    message: `Node ${node.name || node.id} has retry logic but ignores Retry-After headers (429/503 responses)`,
    raw_details: `Add expression to parse Retry-After header: const retryAfter = $json.headers['retry-after']; const delay = retryAfter ? (parseInt(retryAfter) || new Date(retryAfter) - Date.now()) : Math.min(1000 * Math.pow(2, $execution.retryCount), 60000); This prevents API bans and respects server rate limits.`,
    nodeId: node.id,
    line: ctx.nodeLines?.[node.id],
  };
});
