import { describe, it, expect } from 'vitest';
import { runAllRules } from '../src/rules';
import { defaultConfig } from '../src/config/default-config';
import type { Graph } from '../src/types';
import { buildStopAndErrorGraphFixture } from './helpers/stop-and-error-fixture';

const cloneConfig = () => structuredClone(defaultConfig);
const mockNodeLines = (graph: Graph) =>
  graph.nodes.reduce<Record<string, number>>((acc, node, idx) => {
    acc[node.id] = idx * 1;
    return acc;
  }, {});

describe('New workflow rules (R7-R12)', () => {
  describe('R7: alert_log_enforcement', () => {
    it('flags an error path that rejoins the main flow without a handler', () => {
      const graph: Graph = {
        nodes: [
          { id: 'A', type: 'httpRequest' },
          { id: 'B', type: 'set' },
          { id: 'C', type: 'set' }, // Rejoin point
          { id: 'D', type: 'start' },
        ],
        edges: [
          { from: 'A', to: 'B', on: 'error' },
          { from: 'B', to: 'C', on: 'success' },
          { from: 'D', to: 'C', on: 'success' },
        ],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R7')).toBeDefined();
    });

    it('passes an error path handled by a notification node', () => {
      const graph: Graph = {
        nodes: [
          { id: 'A', type: 'httpRequest' },
          { id: 'B', type: 'slack' }, // Handler
        ],
        edges: [{ from: 'A', to: 'B', on: 'error' }],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R7')).toBeUndefined();
    });

    it('passes a shared error handler', () => {
      const graph: Graph = {
        nodes: [
          { id: 'A', type: 'httpRequest' },
          { id: 'B', type: 'googleApi' },
          { id: 'C', type: 'slack' }, // Shared handler
        ],
        edges: [
          { from: 'A', to: 'C', on: 'error' },
          { from: 'B', to: 'C', on: 'error' },
        ],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R7')).toBeUndefined();
    });
  });

  describe('R8: unused_data', () => {
    it('flags a data path that leads to no meaningful consumer', () => {
      const graph: Graph = {
        nodes: [
          { id: 'A', name: 'Get Data', type: 'httpRequest' },
          { id: 'B', type: 'set', params: { value: 'static' } },
          { id: 'C', type: 'noOp' },
        ],
        edges: [
          { from: 'A', to: 'B', on: 'success' },
          { from: 'B', to: 'C', on: 'success' },
        ],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R8')).toBeDefined();
    });

    it('passes a data path that leads to a notification node', () => {
      const graph: Graph = {
        nodes: [
          { id: 'A', name: 'Get Data', type: 'httpRequest' },
          { id: 'B', type: 'slack' },
        ],
        edges: [{ from: 'A', to: 'B', on: 'success' }],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R8')).toBeUndefined();
    });

    it('passes a data path that leads to a mutation node', () => {
      const graph: Graph = {
        nodes: [
          { id: 'A', name: 'Get Data', type: 'httpRequest' },
          { id: 'B', type: 'googleSheets' },
        ],
        edges: [{ from: 'A', to: 'B', on: 'success' }],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R8')).toBeUndefined();
    });

    it('passes a data path that leads to an API node', () => {
      const graph: Graph = {
        nodes: [
          { id: 'A', name: 'Webhook', type: 'webhook' },
          { id: 'B', name: 'Call API', type: 'httpRequest' },
        ],
        edges: [{ from: 'A', to: 'B', on: 'success' }],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R8')).toBeUndefined();
    });

    it('passes a data path that leads to a terminal node', () => {
      const graph: Graph = {
        nodes: [
          { id: 'A', name: 'Get Data', type: 'httpRequest' },
          { id: 'B', name: 'Respond', type: 'respondToWebhook' },
        ],
        edges: [{ from: 'A', to: 'B', on: 'success' }],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R8')).toBeUndefined();
    });
  });

  describe('R9: config_literals', () => {
    it('flags a hardcoded environment literal in a URL', () => {
      const graph: Graph = {
        nodes: [{ id: 'A', type: 'httpRequest', params: { url: 'https://api.prod.company.com/v1/users' } }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R9')).toBeDefined();
    });

    it('flags a hardcoded environment literal', () => {
      const graph: Graph = {
        nodes: [{ id: 'A', type: 'set', params: { env: 'production' } }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R9')).toBeDefined();
    });

    it('passes a valid string that is not a denied literal', () => {
      const graph: Graph = {
        nodes: [{ id: 'A', type: 'set', params: { deviceId: 'device-123' } }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R9')).toBeUndefined();
    });
  });

  describe('R10: naming_convention', () => {
    it('flags a node with a generic name', () => {
      const graph: Graph = {
        nodes: [{ id: 'A', type: 'n8n-nodes-base.if', name: 'IF' }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R10')).toBeDefined();
    });

    it('passes a node with a descriptive name', () => {
      const graph: Graph = {
        nodes: [{ id: 'A', type: 'n8n-nodes-base.if', name: 'Is user active?' }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R10')).toBeUndefined();
    });
  });

  describe('R11: deprecated_nodes', () => {
    it('flags a deprecated node type', () => {
      const graph: Graph = {
        nodes: [{ id: 'A', type: 'n8n-nodes-base.splitInBatches' }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R11')).toBeDefined();
    });
  });

  describe('R12: unhandled_error_path', () => {
    it('flags an error-prone node with no error path', () => {
      const graph: Graph = {
        nodes: [{ id: 'A', type: 'httpRequest' }],
        edges: [],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R12')).toBeDefined();
    });

    it('passes an error-prone node with an error path', () => {
      const graph: Graph = {
        nodes: [{ id: 'A', type: 'httpRequest' }, { id: 'B', type: 'noop' }],
        edges: [{ from: 'A', to: 'B', on: 'error' }],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R12')).toBeUndefined();
    });

    it('treats Stop and Error nodes as valid error handlers even if mislabelled', () => {
      const graph = buildStopAndErrorGraphFixture();
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      expect(findings.find((f) => f.rule === 'R12')).toBeUndefined();
    });
  });

  describe('R13: webhook_acknowledgment', () => {
    it('flags webhook without immediate response before heavy processing', () => {
      const graph: Graph = {
        nodes: [
          { id: '1', type: 'n8n-nodes-base.webhook', name: 'Webhook', params: { path: 'test' } },
          { id: '2', type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request', params: { url: 'https://api.example.com' } },
          { id: '3', type: 'n8n-nodes-base.respondToWebhook', name: 'Respond', params: { respondWith: 'text' } },
        ],
        edges: [
          { from: '1', to: '2', on: 'success' },
          { from: '2', to: '3', on: 'success' },
        ],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      const r13Findings = findings.filter((f) => f.rule === 'R13');

      expect(r13Findings).toHaveLength(1);
      expect(r13Findings[0]!.message).toContain('heavy processing before acknowledgment');
      expect(r13Findings[0]!.severity).toBe('must');
    });

    it('passes webhook with immediate response', () => {
      const graph: Graph = {
        nodes: [
          { id: '1', type: 'n8n-nodes-base.webhook', name: 'Webhook', params: { path: 'test' } },
          { id: '2', type: 'n8n-nodes-base.respondToWebhook', name: 'Respond', params: { respondWith: 'text' } },
          { id: '3', type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request', params: { url: 'https://api.example.com' } },
        ],
        edges: [
          { from: '1', to: '2', on: 'success' },
          { from: '2', to: '3', on: 'success' },
        ],
        meta: {},
      };
      const findings = runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) });
      const r13Findings = findings.filter((f) => f.rule === 'R13');

      expect(r13Findings).toHaveLength(0); // Good pattern - no findings
    });
  });

  describe('R14: retry_after_compliance', () => {
    const createHttpNodeGraph = (nodeConfig: Partial<{ name?: string; params?: any; flags?: any }>) => ({
      nodes: [{ id: '1', type: 'n8n-nodes-base.httpRequest', name: 'API Call', ...nodeConfig }],
      edges: [],
      meta: {},
    });

    const getR14Findings = (graph: Graph) =>
      runAllRules(graph, { path: 'test.json', cfg: cloneConfig(), nodeLines: mockNodeLines(graph) })
        .filter((f) => f.rule === 'R14');

    it('flags HTTP node with retry but without Retry-After handling', () => {
      const graph = createHttpNodeGraph({ params: { url: 'https://api.example.com', options: { retryOnFail: true } } });
      const findings = getR14Findings(graph);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.message).toContain('ignores Retry-After headers');
      expect(findings[0]!.severity).toBe('should');
    });

    it('passes HTTP node with Retry-After header handling', () => {
      const graph = createHttpNodeGraph({
        name: 'API Call with Retry-After',
        params: {
          url: 'https://api.example.com',
          options: {
            retryOnFail: true,
            retryDelay: '{{ $json.headers["retry-after"] ? parseInt($json.headers["retry-after"]) * 1000 : 1000 }}',
          },
        },
      });
      expect(getR14Findings(graph)).toHaveLength(0);
    });

    it('passes HTTP node without retry enabled', () => {
      const graph = createHttpNodeGraph({ params: { url: 'https://api.example.com' } });
      expect(getR14Findings(graph)).toHaveLength(0);
    });

    it('passes HTTP node with retryAfter in params', () => {
      const graph = createHttpNodeGraph({
        params: {
          url: 'https://api.example.com',
          retryOnFail: true,
          customRetryAfter: '{{ $json.headers["retry_after"] }}',
        },
      });
      expect(getR14Findings(graph)).toHaveLength(0);
    });

    it('flags HTTP node with explicit retry config but no Retry-After', () => {
      const graph = createHttpNodeGraph({
        flags: { retryOnFail: true },
        params: { url: 'https://api.stripe.com/v1/charges' },
      });
      const findings = getR14Findings(graph);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.message).toContain('ignores Retry-After headers');
    });
  });
});
