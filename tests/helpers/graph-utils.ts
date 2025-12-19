import type { Graph } from '../../src/types';
import { defaultConfig } from '../../src/config/default-config';
import { runAllRules } from '../../src/rules';

/**
 * Creates a simple graph structure for testing rules.
 * Helps reduce duplication in test graph definitions.
 */
export const createSimpleGraph = (nodes: any[], edges: any[] = []): Graph => ({
  nodes,
  edges,
  meta: {},
});

/**
 * Clones the default configuration.
 */
export const cloneConfig = () => structuredClone(defaultConfig);

/**
 * Mocks node line numbers for a graph.
 */
export const mockNodeLines = (graph: Graph) =>
  graph.nodes.reduce<Record<string, number>>((acc, node, idx) => {
    acc[node.id] = idx + 1;
    return acc;
  }, {});

/**
 * Analyzes a graph against a specific rule.
 */
export const analyzeGraph = (graph: Graph, ruleId: string) => {
  const findings = runAllRules(graph, { 
    path: 'test.json', 
    cfg: cloneConfig(), 
    nodeLines: mockNodeLines(graph) 
  });
  return findings.find((f) => f.rule === ruleId);
};

