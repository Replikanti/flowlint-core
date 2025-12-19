import { describe, it, expect } from 'vitest';
import { buildStopAndErrorGraphFixture } from './helpers/stop-and-error-fixture';
import { createSimpleGraph, analyzeGraph } from './helpers/graph-utils';

describe('New workflow rules (R7-R12)', () => {
  describe('R7: alert_log_enforcement', () => {
    it('flags an error path that rejoins the main flow without a handler', () => {
      const graph = createSimpleGraph(
        [
          { id: 'A', type: 'httpRequest' },
          { id: 'B', type: 'set' },
          { id: 'C', type: 'set' }, // Rejoin point
          { id: 'D', type: 'start' },
        ],
        [
          { from: 'A', to: 'B', on: 'error' },
          { from: 'B', to: 'C', on: 'success' },
          { from: 'D', to: 'C', on: 'success' },
        ],
      );
      expect(analyzeGraph(graph, 'R7')).toBeDefined();
    });

    it('passes an error path handled by a notification node', () => {
      const graph = createSimpleGraph(
        [
          { id: 'A', type: 'httpRequest' },
          { id: 'B', type: 'slack' }, // Handler
        ],
        [{ from: 'A', to: 'B', on: 'error' }],
      );
      expect(analyzeGraph(graph, 'R7')).toBeUndefined();
    });

    it('passes a shared error handler', () => {
      const graph = createSimpleGraph(
        [
          { id: 'A', type: 'httpRequest' },
          { id: 'B', type: 'googleApi' },
          { id: 'C', type: 'slack' }, // Shared handler
        ],
        [
          { from: 'A', to: 'C', on: 'error' },
          { from: 'B', to: 'C', on: 'error' },
        ],
      );
      expect(analyzeGraph(graph, 'R7')).toBeUndefined();
    });
  });

  describe('R8: unused_data', () => {
    it('flags a data path that leads to no meaningful consumer', () => {
      const graph = createSimpleGraph(
        [
          { id: 'A', name: 'Get Data', type: 'httpRequest' },
          { id: 'B', type: 'set', params: { value: 'static' } },
          { id: 'C', type: 'noOp' },
        ],
        [
          { from: 'A', to: 'B', on: 'success' },
          { from: 'B', to: 'C', on: 'success' },
        ],
      );
      expect(analyzeGraph(graph, 'R8')).toBeDefined();
    });

    it.each([
      { type: 'slack', desc: 'notification node' },
      { type: 'googleSheets', desc: 'mutation node' },
      { type: 'httpRequest', desc: 'API node', name: 'Call API' },
      { type: 'respondToWebhook', desc: 'terminal node', name: 'Respond' }
    ])('passes a data path that leads to a $desc', ({ type, name }) => {
      const graph = createSimpleGraph(
        [
          { id: 'A', name: 'Get Data', type: 'httpRequest' },
          { id: 'B', name: name, type },
        ],
        [{ from: 'A', to: 'B', on: 'success' }],
      );
      expect(analyzeGraph(graph, 'R8')).toBeUndefined();
    });
  });

  describe('R9: config_literals', () => {
    it.each([
      { desc: 'URL', params: { url: 'https://api.prod.company.com/v1/users' }, type: 'httpRequest', shouldFlag: true },
      { desc: 'environment literal', params: { env: 'production' }, type: 'set', shouldFlag: true },
      { desc: 'valid string', params: { deviceId: 'device-123' }, type: 'set', shouldFlag: false },
    ])('checks hardcoded literals: $desc', ({ params, type, shouldFlag }) => {
      const graph = createSimpleGraph([{ id: 'A', type, params }]);
      const result = analyzeGraph(graph, 'R9');
      if (shouldFlag) {
        expect(result).toBeDefined();
      } else {
        expect(result).toBeUndefined();
      }
    });
  });

  describe('R10: naming_convention', () => {
    it.each([
      { name: 'IF', shouldFlag: true, desc: 'generic name' },
      { name: 'Is user active?', shouldFlag: false, desc: 'descriptive name' }
    ])('checks node name: $desc', ({ name, shouldFlag }) => {
      const graph = createSimpleGraph([{ id: 'A', type: 'n8n-nodes-base.if', name }]);
      const result = analyzeGraph(graph, 'R10');
      if (shouldFlag) {
        expect(result).toBeDefined();
      } else {
        expect(result).toBeUndefined();
      }
    });
  });

  describe('R11: deprecated_nodes', () => {
    it('flags a deprecated node type', () => {
      const graph = createSimpleGraph([{ id: 'A', type: 'n8n-nodes-base.splitInBatches' }]);
      expect(analyzeGraph(graph, 'R11')).toBeDefined();
    });
  });

  describe('R12: unhandled_error_path', () => {
    it('flags an error-prone node with no error path', () => {
      const graph = createSimpleGraph([{ id: 'A', type: 'httpRequest' }]);
      expect(analyzeGraph(graph, 'R12')).toBeDefined();
    });

    it('passes an error-prone node with an error path', () => {
      const graph = createSimpleGraph(
        [{ id: 'A', type: 'httpRequest' }, { id: 'B', type: 'noop' }],
        [{ from: 'A', to: 'B', on: 'error' }],
      );
      expect(analyzeGraph(graph, 'R12')).toBeUndefined();
    });

    it('treats Stop and Error nodes as valid error handlers even if mislabelled', () => {
      const graph = buildStopAndErrorGraphFixture();
      expect(analyzeGraph(graph, 'R12')).toBeUndefined();
    });
  });

  describe('R13: webhook_acknowledgment', () => {
    const createWebhookGraph = (hasImmediateResponse: boolean): Graph => {
        const nodes = [
            { id: '1', type: 'n8n-nodes-base.webhook', name: 'Webhook', params: { path: 'test' } },
        ];
        
        if (hasImmediateResponse) {
             nodes.push(
                 { id: '2', type: 'n8n-nodes-base.respondToWebhook', name: 'Respond', params: { respondWith: 'text' } },
                 { id: '3', type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request', params: { url: 'https://api.example.com' } }
             );
        } else {
             nodes.push(
                { id: '2', type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request', params: { url: 'https://api.example.com' } },
                { id: '3', type: 'n8n-nodes-base.respondToWebhook', name: 'Respond', params: { respondWith: 'text' } },
             );
        }

        const edges = [
            { from: '1', to: '2', on: 'success' },
            { from: '2', to: '3', on: 'success' },
        ];

        return createSimpleGraph(nodes, edges);
    };

    it('flags webhook without immediate response before heavy processing', () => {
      const graph = createWebhookGraph(false);
      const finding = analyzeGraph(graph, 'R13');

      expect(finding).toBeDefined();
      expect(finding!.message).toContain('heavy processing before acknowledgment');
      expect(finding!.severity).toBe('must');
    });

    it('passes webhook with immediate response', () => {
      const graph = createWebhookGraph(true);
      expect(analyzeGraph(graph, 'R13')).toBeUndefined();
    });
  });

  describe('R14: retry_after_compliance', () => {
    const createHttpNodeGraph = (nodeConfig: Partial<{ name?: string; params?: any; flags?: any }>) => 
      createSimpleGraph([{ id: '1', type: 'n8n-nodes-base.httpRequest', name: 'API Call', ...nodeConfig }]);

    it('flags HTTP node with retry but without Retry-After handling', () => {
      const graph = createHttpNodeGraph({ params: { url: 'https://api.example.com', options: { retryOnFail: true } } });
      const finding = analyzeGraph(graph, 'R14');

      expect(finding).toBeDefined();
      expect(finding!.message).toContain('ignores Retry-After headers');
      expect(finding!.severity).toBe('should');
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
      expect(analyzeGraph(graph, 'R14')).toBeUndefined();
    });

    it('passes HTTP node with retryAfter in params', () => {
      const graph = createHttpNodeGraph({
        params: {
          url: 'https://api.example.com',
          retryOnFail: true,
          customRetryAfter: '{{ $json.headers["retry_after"] }}',
        },
      });
      expect(analyzeGraph(graph, 'R14')).toBeUndefined();
    });

    it('flags HTTP node with explicit retry config but no Retry-After', () => {
      const graph = createHttpNodeGraph({
        flags: { retryOnFail: true },
        params: { url: 'https://api.stripe.com/v1/charges' },
      });
      const finding = analyzeGraph(graph, 'R14');

      expect(finding).toBeDefined();
      expect(finding!.message).toContain('ignores Retry-After headers');
    });
  });
});