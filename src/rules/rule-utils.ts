import type { Graph, Finding, NodeRef, FindingSeverity } from '../types';
import type { FlowLintConfig } from '../config';
import { collectStrings, toRegex } from '../utils/utils';

type Rule = string;
type RuleContext = { path: string; cfg: FlowLintConfig; nodeLines?: Record<string, number> };
type RuleRunner = (graph: Graph, ctx: RuleContext) => Finding[];
type NodeRuleLogic = (node: NodeRef, graph: Graph, ctx: RuleContext) => Finding | Finding[] | null;

/**
 * A higher-order function to create a rule that iterates over each node in the graph.
 * It abstracts the boilerplate of checking if the rule is enabled and iterating through nodes.
 *
 * @param ruleId - The ID of the rule (e.g., 'R1').
 * @param configKey - The key in the FlowLintConfig rules object.
 * @param logic - The function containing the core logic to be executed for each node.
 * @returns A RuleRunner function.
 */
export function createNodeRule(
  ruleId: Rule,
  configKey: keyof FlowLintConfig['rules'],
  logic: NodeRuleLogic,
): RuleRunner {
  return (graph: Graph, ctx: RuleContext): Finding[] => {
    const ruleConfig = ctx.cfg.rules[configKey] as { enabled?: boolean };
    if (!ruleConfig?.enabled) {
      return [];
    }

    const findings: Finding[] = [];
    for (const node of graph.nodes) {
      const result = logic(node, graph, ctx);
      if (result) {
        if (Array.isArray(result)) {
          findings.push(...result);
        } else {
          findings.push(result);
        }
      }
    }
    return findings;
  };
}

type HardcodedStringRuleOptions = {
  ruleId: Rule;
  severity: FindingSeverity;
  configKey: 'secrets' | 'config_literals';
  messageFn: (node: NodeRef, value: string) => string;
  details: string;
};

/**
 * Creates a rule that checks for hardcoded strings in node parameters based on a denylist of regex patterns.
 * This is used to create R4 (Secrets) and R9 (Config Literals).
 *
 * @param options - The configuration for the hardcoded string rule.
 * @returns A RuleRunner function.
 */
export function createHardcodedStringRule({
  ruleId,
  severity,
  configKey,
  messageFn,
  details,
}: HardcodedStringRuleOptions): RuleRunner {
  const logic: NodeRuleLogic = (node, graph, ctx) => {
    const cfg = ctx.cfg.rules[configKey];
    if (!cfg.denylist_regex?.length) {
      return null;
    }
    const regexes = cfg.denylist_regex.map((pattern) => toRegex(pattern));

    const findings: Finding[] = [];
    const strings = collectStrings(node.params);

    for (const value of strings) {
      // Ignore expressions and empty strings
      if (!value || value.includes('{{')) {
        continue;
      }

      if (regexes.some((regex) => regex.test(value))) {
        findings.push({
          rule: ruleId,
          severity,
          path: ctx.path,
          message: messageFn(node, value),
          nodeId: node.id,
          line: ctx.nodeLines?.[node.id],
          raw_details: details,
        });
        // Only report one finding per node to avoid noise
        break;
      }
    }
    return findings;
  };

  return createNodeRule(ruleId, configKey, logic);
}

