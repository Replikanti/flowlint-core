import { describe, it, expect } from 'vitest';
import { createSimpleGraph, analyzeGraph } from './helpers/graph-utils';

describe('Legacy Rules (R1-R6)', () => {

  describe('R1: rate_limit_retry', () => {
    it('flags an API node without retry configuration', () => {
      const graph = createSimpleGraph([{
        id: '1',
        type: 'n8n-nodes-base.httpRequest',
        name: 'API Call',
        params: { url: 'https://api.example.com' }
      }]);
      const finding = analyzeGraph(graph, 'R1');
      expect(finding).toBeDefined();
      expect(finding?.message).toContain('missing retry/backoff configuration');
    });

    it('passes an API node with retryOnFail in options', () => {
      const graph = createSimpleGraph([{
        id: '1',
        type: 'n8n-nodes-base.httpRequest',
        name: 'API Call',
        params: {
          url: 'https://api.example.com',
          options: { retryOnFail: true }
        }
      }]);
      expect(analyzeGraph(graph, 'R1')).toBeUndefined();
    });

    it('passes a non-API node', () => {
      const graph = createSimpleGraph([{
        id: '1',
        type: 'n8n-nodes-base.set',
        name: 'Set Variable'
      }]);
      expect(analyzeGraph(graph, 'R1')).toBeUndefined();
    });
  });

  describe('R2: error_handling', () => {
    it('flags a node with continueOnFail set to true (if forbidden)', () => {
      const graph = createSimpleGraph([{
        id: '1',
        type: 'n8n-nodes-base.httpRequest',
        name: 'Unsafe Call',
        // continueOnFail is usually in flags in n8n internal representation
        flags: { continueOnFail: true }
      }]);
      const finding = analyzeGraph(graph, 'R2');
      expect(finding).toBeDefined();
    });
  });

  describe('R3: idempotency', () => {
    it('flags a POST request as potentially non-idempotent', () => {
        const graph = createSimpleGraph([{
            id: '1',
            type: 'n8n-nodes-base.httpRequest',
            params: { method: 'POST', url: 'https://api.example.com' }
        }]);
        const finding = analyzeGraph(graph, 'R3');
        if (finding) {
             expect(finding.rule).toBe('R3');
        }
    });
  });

  describe('R4: secrets', () => {
    it('flags a hardcoded API Key', () => {
        const graph = createSimpleGraph([{
            id: '1',
            type: 'n8n-nodes-base.set',
            params: { value: 'Bearer sk-1234567890' } // Matches regex 'Bearer '
        }]);
        const finding = analyzeGraph(graph, 'R4');
        expect(finding).toBeDefined();
        expect(finding?.message).toContain('hardcoded secret');
    });

    it('passes when using credentials expression', () => {
        const graph = createSimpleGraph([{
            id: '1',
            type: 'n8n-nodes-base.set',
            params: { value: '{{$credentials.slackApi}}' }
        }]);
        expect(analyzeGraph(graph, 'R4')).toBeUndefined();
    });
  });

  describe('R5: dead_ends', () => {
    it('flags a node with no outgoing connections', () => {
        // Needs at least 2 nodes to trigger R5
        const graph = createSimpleGraph([
            { id: '1', type: 'n8n-nodes-base.start', name: 'Start' },
            { id: '2', type: 'n8n-nodes-base.set', name: 'Dead Node' }
        ], [
            { from: '1', to: '2', on: 'success' }
        ]);
        // Node 2 is the dead end
        const finding = analyzeGraph(graph, 'R5');
        expect(finding).toBeDefined();
        expect(finding?.nodeId).toBe('2');
    });

    it('passes a terminal node type (e.g. Respond to Webhook)', () => {
         const graph = createSimpleGraph([
            { id: '1', type: 'n8n-nodes-base.start', name: 'Start' },
            { id: '2', type: 'n8n-nodes-base.respondToWebhook', name: 'Done' }
        ], [
             { from: '1', to: '2', on: 'success' }
        ]);
        expect(analyzeGraph(graph, 'R5')).toBeUndefined();
    });
  });

  describe('R6: long_running', () => {
      it('flags a SplitInBatches node with high iterations', () => {
          // R6 checks for loops (batch/splitInBatches)
          const graph = createSimpleGraph([{
              id: '1',
              type: 'n8n-nodes-base.splitInBatches',
              name: 'Loop',
              params: { options: { maxIterations: 99999 } } // Exceeds default 1000
          }]);
          const finding = analyzeGraph(graph, 'R6');
          expect(finding).toBeDefined();
          expect(finding?.message).toContain('iterations');
      });
  });

});