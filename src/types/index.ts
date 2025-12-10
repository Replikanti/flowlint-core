/**
 * Types module exports
 */

export type PRFile = {
  filename: string;
  status: string;
  sha?: string;
  patch?: string;
};

export type FindingSeverity = 'must' | 'should' | 'nit';

export type Finding = {
  rule: string;
  severity: FindingSeverity;
  path: string;
  message: string;
  raw_details?: string;
  nodeId?: string;
  line?: number;
  documentationUrl?: string;
};

export type NodeRef = {
  id: string;
  type: string;
  name?: string;
  params?: Record<string, unknown>;
  cred?: Record<string, unknown>;
  flags?: {
    continueOnFail?: boolean;
    retryOnFail?: boolean | string;
    waitBetweenTries?: number | string;
    maxTries?: number | string;
  };
};

export type Edge = {
  from: string;
  to: string;
  on?: 'success' | 'error' | 'timeout';
};

export type Graph = {
  nodes: NodeRef[];
  edges: Edge[];
  meta: Record<string, unknown>;
};

// Rule context passed to each rule
export type RuleContext = {
  path: string;
  cfg: import('../config').FlowLintConfig;
  nodeLines?: Record<string, number>;
};

// Rule runner function type
export type RuleRunner = (graph: Graph, ctx: RuleContext) => Finding[];
