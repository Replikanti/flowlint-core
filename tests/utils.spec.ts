import { describe, it, expect } from 'vitest';
import {
  findAllDownstreamNodes,
  findAllUpstreamNodes,
  flattenConnections,
  isRejoinNode,
  buildValidationErrors,
  collectStrings,
  toRegex,
} from '../src/utils/utils';
import type { Graph } from '../src/types';

describe('Graph Utilities', () => {
  const createGraph = (edges: [string, string, string?][]): Graph => ({
    nodes: [],
    edges: edges.map(([from, to, on]) => ({ from, to, on: on || 'main', type: 'main' })),
    meta: {
      workflowId: 'test',
      workflowName: 'test',
      createdAt: 'now',
      updatedAt: 'now',
      tags: [],
    },
  });

  describe('findAllDownstreamNodes', () => {
    it('should find all downstream nodes in a linear chain', () => {
      const graph = createGraph([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
      ]);
      const downstream = findAllDownstreamNodes(graph, 'A');
      expect(downstream).toEqual(new Set(['A', 'B', 'C', 'D']));
    });

    it('should handle branching', () => {
      const graph = createGraph([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
        ['C', 'E'],
      ]);
      const downstream = findAllDownstreamNodes(graph, 'A');
      expect(downstream).toEqual(new Set(['A', 'B', 'C', 'D', 'E']));
    });

    it('should handle cycles', () => {
      const graph = createGraph([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'A'],
      ]);
      const downstream = findAllDownstreamNodes(graph, 'A');
      expect(downstream).toEqual(new Set(['A', 'B', 'C']));
    });

    it('should return only the start node if no outgoing edges', () => {
        const graph = createGraph([]);
        const downstream = findAllDownstreamNodes(graph, 'A');
        expect(downstream).toEqual(new Set(['A']));
    });
  });

  describe('findAllUpstreamNodes', () => {
    it('should find all upstream nodes in a linear chain', () => {
      const graph = createGraph([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
      ]);
      const upstream = findAllUpstreamNodes(graph, 'D');
      expect(upstream).toEqual(new Set(['D', 'C', 'B', 'A']));
    });

    it('should handle converging branches', () => {
      const graph = createGraph([
        ['A', 'C'],
        ['B', 'C'],
        ['C', 'D'],
      ]);
      const upstream = findAllUpstreamNodes(graph, 'D');
      expect(upstream).toEqual(new Set(['D', 'C', 'A', 'B']));
    });

    it('should handle cycles', () => {
      const graph = createGraph([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'A'],
      ]);
      const upstream = findAllUpstreamNodes(graph, 'A');
      expect(upstream).toEqual(new Set(['A', 'C', 'B']));
    });

    it('should return only the start node if no incoming edges', () => {
        const graph = createGraph([]);
        const upstream = findAllUpstreamNodes(graph, 'A');
        expect(upstream).toEqual(new Set(['A']));
    });
  });

  describe('flattenConnections', () => {
    it('should flatten nested arrays', () => {
      const input = [[{ node: 'A' }, { node: 'B' }], { node: 'C' }, [[{ node: 'D' }]]];
      const result = flattenConnections(input);
      expect(result).toEqual([{ node: 'A' }, { node: 'B' }, { node: 'C' }, { node: 'D' }]);
    });

    it('should handle empty input', () => {
      expect(flattenConnections(null)).toEqual([]);
      expect(flattenConnections([])).toEqual([]);
    });
  });

  describe('isRejoinNode', () => {
    it('should return true for a node with both error and success inputs', () => {
      const graph = createGraph([
        ['A', 'C', 'main'],
        ['B', 'C', 'error'],
      ]);
      expect(isRejoinNode(graph, 'C')).toBe(true);
    });

    it('should return false for single input', () => {
      const graph = createGraph([['A', 'B']]);
      expect(isRejoinNode(graph, 'B')).toBe(false);
    });

    it('should return false for multiple success inputs only', () => {
      const graph = createGraph([
        ['A', 'C', 'main'],
        ['B', 'C', 'main'],
      ]);
      expect(isRejoinNode(graph, 'C')).toBe(false);
    });
  });

  describe('buildValidationErrors', () => {
    it('should generate errors from a set', () => {
      const items = new Set(['a', 'b']);
      const errors = buildValidationErrors(items, {
        path: 'test.path',
        messageTemplate: (item) => `Error: ${item}`,
        suggestionTemplate: (item) => `Fix: ${item}`,
      });

      expect(errors).toEqual([
        { path: 'test.path', message: 'Error: a', suggestion: 'Fix: a' },
        { path: 'test.path', message: 'Error: b', suggestion: 'Fix: b' },
      ]);
    });

    it('should generate errors from an array', () => {
      const items = ['a'];
      const errors = buildValidationErrors(items, {
        path: 'path',
        messageTemplate: (i) => i,
        suggestionTemplate: (i) => i,
      });
      expect(errors).toHaveLength(1);
    });
  });

  describe('collectStrings', () => {
    it('should collect strings from nested objects and arrays', () => {
      const input = {
        a: 'hello',
        b: { c: 'world', d: 123 },
        e: ['foo', { f: 'bar' }],
      };
      const strings = collectStrings(input);
      expect(strings).toEqual(expect.arrayContaining(['hello', 'world', 'foo', 'bar']));
      expect(strings).not.toContain(123);
    });

    it('should handle null/undefined', () => {
        expect(collectStrings(null)).toEqual([]);
        expect(collectStrings(undefined)).toEqual([]);
    });
  });

  describe('toRegex', () => {
    it('should create a regex from string', () => {
      const regex = toRegex('^test$');
      expect(regex.test('test')).toBe(true);
      expect(regex.test('testing')).toBe(false);
    });

    it('should handle case-insensitive flag prefix (?i)', () => {
      const regex = toRegex('(?i)test');
      expect(regex.flags).toContain('i');
      expect(regex.test('TEST')).toBe(true);
    });
  });
});
