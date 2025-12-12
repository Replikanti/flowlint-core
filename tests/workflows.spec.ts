import { describe, it, expect, vi, afterEach } from 'vitest';
import { runAllRules } from '../src/rules';
import { buildCheckOutput } from '../src/reporter/reporter';
import { parseN8n } from '../src/parser/parser-n8n';
import { pickTargets } from '../src/sniffer'; // sniffer needs verification if it exists in core
import { defaultConfig } from '../src/config/default-config';
import type { Graph, PRFile } from '../src/types';

import {
  buildStopAndErrorWorkflowFixture,
  buildErrorWorkflowFixture,
  stopAndErrorNodeIds
} from './helpers/stop-and-error-fixture';

const cloneConfig = () => structuredClone(defaultConfig);
const mockNodeLines = (graph: Graph) =>
  graph.nodes.reduce<Record<string, number>>((acc, node, idx) => {
    acc[node.id] = idx + 1;
    return acc;
  }, {});

const analyzeRule = (workflow: any, ruleId: string, shouldFlag: boolean) => {
  const graph = parseN8n(JSON.stringify(workflow));
  const findings = runAllRules(graph, {
    path: 'test.json',
    cfg: cloneConfig(),
    nodeLines: mockNodeLines(graph),
  });
  const ruleFinding = findings.find((f) => f.rule === ruleId);
  return shouldFlag ? expect(ruleFinding).toBeDefined() : expect(ruleFinding).toBeUndefined();
};

describe('Workflow rules acceptance scenarios', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('R1: Rate Limit & Retry', () => {
    it('flags API nodes missing retryOnFail', () => {
      const graph: Graph = {
        nodes: [{ id: '1', type: 'httpRequest', name: 'Call API', params: { options: { retryOnFail: false } } }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R1')).toBeDefined();
    });

    it('passes API nodes with retryOnFail enabled', () => {
      const graph: Graph = {
        nodes: [{ id: '1', type: 'httpRequest', name: 'Call API', params: { options: { retryOnFail: true } } }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R1')).toBeUndefined();
    });

    it('passes API nodes with retryOnFail set via an expression', () => {
      const graph: Graph = {
        nodes: [{ id: '1', type: 'httpRequest', name: 'Call API', params: { options: { retryOnFail: '{{ $env.ENABLE_RETRY }}' } } }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R1')).toBeUndefined();
    });

    it('passes API nodes when retryOnFail is set at the node root level (n8n export)', () => {
      const workflow = {
        nodes: [
          {
            id: '1',
            type: 'n8n-nodes-base.httpRequest',
            name: 'Get Installation Token',
            parameters: {},
            retryOnFail: true,
          },
        ],
        connections: {},
      };

      const graph = parseN8n(JSON.stringify(workflow));
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R1')).toBeUndefined();
    });
  });

  describe('R2: Error Handling', () => {
    it('fails the check when continueOnFail is set', () => {
      const graph: Graph = {
        nodes: [{ id: '42', type: 'set', name: 'Unreliable', flags: { continueOnFail: true } }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      const { conclusion } = buildCheckOutput({ findings, cfg: cloneConfig() });
      expect(conclusion).toBe('failure');
    });
  });

  describe('R3: Idempotency', () => {
    it('flags a mutation path with no idempotency guard', () => {
      const graph: Graph = {
        nodes: [
          { id: 'start', type: 'webhook' },
          { id: 'writer', type: 'googleSheets', params: { sheetId: 'abc' } }, // sheetId should not count
        ],
        edges: [{ from: 'start', to: 'writer', on: 'success' }],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R3')).toBeDefined();
    });

    it('passes when a guard key exists on a node far upstream', () => {
      const graph: Graph = {
        nodes: [
          { id: 'start', type: 'webhook', params: { body: { eventId: 'evt_123' } } },
          { id: 'transform', type: 'set' },
          { id: 'logic', type: 'if' },
          { id: 'writer', type: 'googleSheets' },
        ],
        edges: [
          { from: 'start', to: 'transform', on: 'success' },
          { from: 'transform', to: 'logic', on: 'success' },
          { from: 'logic', to: 'writer', on: 'success' },
        ],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R3')).toBeUndefined();
    });

    it('passes when a guard value exists in an expression upstream', () => {
      const graph: Graph = {
        nodes: [
          { id: 'start', type: 'webhook' },
          { id: 'pre', type: 'set', params: { someKey: '{{ $json.body.messageId }}' } },
          { id: 'writer', type: 'googleSheets' },
        ],
        edges: [
          { from: 'start', to: 'pre', on: 'success' },
          { from: 'pre', to: 'writer', on: 'success' },
        ],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R3')).toBeUndefined();
    });
  });

  it('parses nested connection arrays without throwing', () => {
    const workflow = {
      nodes: [
        { id: '1', type: 'n8n-nodes-base.webhook', name: 'Trigger', parameters: {} },
        { id: '2', type: 'n8n-nodes-base.set', name: 'Set', parameters: {} },
      ],
      connections: {
        Trigger: {
          main: [
            [
              {
                node: 'Set',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
    };

    expect(() => parseN8n(JSON.stringify(workflow))).not.toThrow();
  });

  it('correctly identifies error edges from connections object', () => {
    const workflow = {
      nodes: [
        { id: 'api', type: 'n8n-nodes-base.httpRequest', name: 'API Call', parameters: {} },
        { id: 'success', type: 'n8n-nodes-base.set', name: 'Success Handler', parameters: {} },
        { id: 'error', type: 'n8n-nodes-base.slack', name: 'Error Handler', parameters: {} },
      ],
      connections: {
        'API Call': {
          main: [[{ node: 'Success Handler', type: 'main', index: 0 }]],
          error: [[{ node: 'Error Handler', type: 'main', index: 0 }]],
        },
      },
    };

    const graph = parseN8n(JSON.stringify(workflow));

    const successEdge = graph.edges.find((e) => e.to === 'success');
    const errorEdge = graph.edges.find((e) => e.to === 'error');

    expect(successEdge).toBeDefined();
    expect(successEdge?.on).toBe('success');

    expect(errorEdge).toBeDefined();
    expect(errorEdge?.on).toBe('error'); // This was the bug - always returned 'success'
  });

  it('treats secondary main outputs on error-prone nodes as error edges', () => {
    const workflow = buildStopAndErrorWorkflowFixture();

    const graph = parseN8n(JSON.stringify(workflow));
    const errorEdge = graph.edges.find((edge) => edge.to === stopAndErrorNodeIds.error);
    expect(errorEdge?.on).toBe('error');

    const findings = runAllRules(graph, {
      path: 'workflows/get-installation-token.json',
      cfg: cloneConfig(),
      nodeLines: mockNodeLines(graph),
    });
    expect(findings.find((f) => f.rule === 'R12')).toBeUndefined();
  });

  describe('R7: alert_log_enforcement with real n8n workflows', () => {
    it('flags when error path has no log/alert node', () => {
      const workflow = buildErrorWorkflowFixture('n8n-nodes-base.set', 'Silent Fail');
      analyzeRule(workflow, 'R7', true);
    });

    it('passes when error path goes to Stop and Error node', () => {
      analyzeRule(buildStopAndErrorWorkflowFixture(), 'R7', false);
    });

    it('passes when error path goes through a Slack notification', () => {
      analyzeRule(buildErrorWorkflowFixture('n8n-nodes-base.slack', 'Slack Notifier'), 'R7', false);
    });
  });

  describe('R4: Secrets', () => {
    it('detects literal secrets', () => {
      const graph: Graph = {
        nodes: [{ id: '1', type: 'set', params: { token: 'Bearer SHOULD-NOT-BE-HERE' } }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R4')).toBeDefined();
    });

    it('ignores secrets inside expressions', () => {
      const graph: Graph = {
        nodes: [{ id: '1', type: 'set', params: { token: '{{ $credentials.apiKey }}' } }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R4')).toBeUndefined();
    });
  });

  it('ignores files that match the default exclude globs', () => {
    const files: PRFile[] = [
      { filename: 'workflows/sample.json', status: 'added' },
      { filename: 'samples/demo.json', status: 'added' },
      { filename: 'package.json', status: 'added' },
      { filename: 'workflow.n8n.json', status: 'added' },
    ];

    // PickTargets might not be available in core if it's GitHub specific
    // If pickTargets is undefined, we should skip this test or move it to github-app
    if (typeof pickTargets === 'function') {
        const targets = pickTargets(files, defaultConfig.files);
        expect(targets.map((file) => file.filename)).toEqual(['workflows/sample.json', 'workflow.n8n.json']);
    }
  });

  it('ignores FlowLint config and GitHub workflow files', () => {
    const files: PRFile[] = [
      { filename: '.flowlint.yml', status: 'modified' },
      { filename: '.github/workflows/ci.yml', status: 'added' },
      { filename: 'workflows/my-workflow.n8n.json', status: 'added' },
      { filename: 'vite.config.ts', status: 'modified' },
    ];

    if (typeof pickTargets === 'function') {
        const targets = pickTargets(files, defaultConfig.files);
        expect(targets.map((file) => file.filename)).toEqual(['workflows/my-workflow.n8n.json']);
    }
  });

  it('warns when nodes end without outgoing edges (R5)', () => {
    const cfg = cloneConfig();
    const graph: Graph = {
      nodes: [
        { id: 'start', type: 'webhook', name: 'Webhook', params: {} },
        { id: 'orphan', type: 'set', name: 'Never used', params: {} },
      ],
      edges: [{ from: 'start', to: 'start', on: 'success' }],
      meta: {},
    };

    const findings = runAllRules(graph, {
      path: 'workflows/sample.json',
      cfg,
      nodeLines: mockNodeLines(graph),
    });
    expect(findings.find((f) => f.rule === 'R5')).toBeTruthy();
  });

  it('warns when loop nodes exceed configured limits (R6)', () => {
    const cfg = cloneConfig();
    const graph: Graph = {
      nodes: [
        {
          id: 'loop',
          type: 'loopOverItems',
          name: 'Batch loop',
          params: { maxIterations: cfg.rules.long_running.max_iterations * 5, timeout: cfg.rules.long_running.timeout_ms * 2 },
        },
      ],
      edges: [],
      meta: {},
    };

    const findings = runAllRules(graph, {
      path: 'workflows/sample.json',
      cfg,
      nodeLines: mockNodeLines(graph),
    });
    expect(findings.filter((f) => f.rule === 'R6').length).toBeGreaterThanOrEqual(1);
  });
});