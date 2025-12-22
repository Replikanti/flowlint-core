import { describe, it, expect, vi, afterEach } from 'vitest';
import { runAllRules } from '../src/rules';
import { buildCheckOutput } from '../src/reporter/reporter';
import { parseN8n } from '../src/parser/parser-n8n';
import { createSimpleGraph, analyzeGraph, cloneConfig, mockNodeLines } from './helpers/graph-utils';

import {
  buildStopAndErrorWorkflowFixture,
  buildErrorWorkflowFixture,
  stopAndErrorNodeIds
} from './helpers/stop-and-error-fixture';

const analyzeRule = (workflow: any, ruleId: string) => {
  const graph = parseN8n(JSON.stringify(workflow));
  const findings = runAllRules(graph, {
    path: 'test.json',
    cfg: cloneConfig(),
    nodeLines: mockNodeLines(graph),
  });
  return findings.find((f) => f.rule === ruleId);
};

describe('Workflow rules acceptance scenarios', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('R1: Rate Limit & Retry', () => {
    it.each([
      { desc: 'flags API nodes missing retryOnFail', retryOnFail: false, shouldFlag: true },
      { desc: 'passes API nodes with retryOnFail enabled', retryOnFail: true, shouldFlag: false },
      { desc: 'passes API nodes with retryOnFail set via an expression', retryOnFail: '{{ $env.ENABLE_RETRY }}', shouldFlag: false },
    ])('$desc', ({ retryOnFail, shouldFlag }) => {
      const graph = createSimpleGraph([{ id: '1', type: 'httpRequest', name: 'Call API', params: { options: { retryOnFail } } }]);
      const finding = analyzeGraph(graph, 'R1');
      if (shouldFlag) expect(finding).toBeDefined();
      else expect(finding).toBeUndefined();
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
      expect(analyzeRule(workflow, 'R1')).toBeUndefined();
    });
  });

  describe('R2: Error Handling', () => {
    it('fails the check when continueOnFail is set', () => {
      const graph = createSimpleGraph([{ id: '42', type: 'set', name: 'Unreliable', flags: { continueOnFail: true } }]);
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      const { conclusion } = buildCheckOutput({ findings, cfg: cloneConfig() });
      expect(conclusion).toBe('failure');
    });
  });

  describe('R3: Idempotency', () => {
    it.each([
      { desc: 'flags a mutation path with no idempotency guard', nodes: [{ id: 'start', type: 'webhook' }, { id: 'writer', type: 'googleSheets', params: { sheetId: 'abc' } }], shouldFlag: true },
      { desc: 'passes when a guard key exists on a node far upstream', nodes: [{ id: 'start', type: 'webhook', params: { body: { eventId: 'evt_123' } } }, { id: 'transform', type: 'set' }, { id: 'logic', type: 'if' }, { id: 'writer', type: 'googleSheets' }], shouldFlag: false },
      { desc: 'passes when a guard value exists in an expression upstream', nodes: [{ id: 'start', type: 'webhook' }, { id: 'pre', type: 'set', params: { someKey: '{{ $json.body.messageId }}' } }, { id: 'writer', type: 'googleSheets' }], shouldFlag: false }
    ])('$desc', ({ nodes, shouldFlag }) => {
       const edges = [];
       for (let i = 0; i < nodes.length - 1; i++) {
           edges.push({ from: nodes[i].id, to: nodes[i+1].id, on: 'success' });
       }
       const graph = createSimpleGraph(nodes, edges);
       const finding = analyzeGraph(graph, 'R3');
       if (shouldFlag) expect(finding).toBeDefined();
       else expect(finding).toBeUndefined();
    });
  });


  it('parses nested connection arrays without throwing', () => {
    const workflow = {
      nodes: [
        { id: '1', type: 'n8n-nodes-base.webhook', name: 'Trigger', parameters: {} },
        { id: '2', type: 'n8n-nodes-base.set', name: 'Set', parameters: {} },
      ],
      connections: {
        Trigger: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
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
    const errorEdge = graph.edges.find((e) => e.to === 'error');
    expect(errorEdge).toBeDefined();
    expect(errorEdge?.on).toBe('error');
  });

  it('treats secondary main outputs on error-prone nodes as error edges', () => {
    const workflow = buildStopAndErrorWorkflowFixture();
    const graph = parseN8n(JSON.stringify(workflow));
    const errorEdge = graph.edges.find((edge) => edge.to === stopAndErrorNodeIds.error);
    expect(errorEdge?.on).toBe('error');
    expect(analyzeGraph(graph, 'R12')).toBeUndefined();
  });

  describe('R7: alert_log_enforcement with real n8n workflows', () => {
    it.each([
        { desc: 'flags when error path has no log/alert node', workflow: buildErrorWorkflowFixture('n8n-nodes-base.set', 'Silent Fail'), shouldFlag: true },
        { desc: 'passes when error path goes to Stop and Error node', workflow: buildStopAndErrorWorkflowFixture(), shouldFlag: false },
        { desc: 'passes when error path goes through a Slack notification', workflow: buildErrorWorkflowFixture('n8n-nodes-base.slack', 'Slack Notifier'), shouldFlag: false }
    ])('$desc', ({ workflow, shouldFlag }) => {
        const finding = analyzeRule(workflow, 'R7');
        if (shouldFlag) expect(finding).toBeDefined();
        else expect(finding).toBeUndefined();
    });
  });

  describe('R4: Secrets', () => {
    it.each([
        { desc: 'detects literal secrets', val: 'Bearer SHOULD-NOT-BE-HERE', shouldFlag: true },
        { desc: 'ignores secrets inside expressions', val: '{{ $credentials.apiKey }}', shouldFlag: false }
    ])('$desc', ({ val, shouldFlag }) => {
         const graph = createSimpleGraph([{ id: '1', type: 'set', params: { token: val } }]);
         const finding = analyzeGraph(graph, 'R4');
         if (shouldFlag) expect(finding).toBeDefined();
         else expect(finding).toBeUndefined();
    });
  });

  it('warns when nodes end without outgoing edges (R5)', () => {
    const graph = createSimpleGraph(
      [
        { id: 'start', type: 'webhook', name: 'Webhook', params: {} },
        { id: 'orphan', type: 'set', name: 'Never used', params: {} },
      ],
      [{ from: 'start', to: 'start', on: 'success' }],
    );
    expect(analyzeGraph(graph, 'R5')).toBeTruthy();
  });

  it('warns when loop nodes exceed configured limits (R6)', () => {
    const cfg = cloneConfig();
    const graph = createSimpleGraph([
      {
        id: 'loop',
        type: 'loopOverItems',
        name: 'Batch loop',
        params: { maxIterations: cfg.rules.long_running.max_iterations * 5, timeout: cfg.rules.long_running.timeout_ms * 2 },
      },
    ]);

    const findings = runAllRules(graph, {
      path: 'workflows/sample.json',
      cfg,
      nodeLines: mockNodeLines(graph),
    });
    expect(findings.filter((f) => f.rule === 'R6').length).toBeGreaterThanOrEqual(1);
  });

});
