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

  describe('Graph Traversal', () => {
    const linearEdges: [string, string, string?][] = [['A', 'B'], ['B', 'C'], ['C', 'D']];
    const cycleEdges: [string, string, string?][] = [['A', 'B'], ['B', 'C'], ['C', 'A']];

    it.each([
      {
        name: 'linear chain',
        edges: linearEdges,
        start: 'A',
        expected: ['A', 'B', 'C', 'D'],
      },
      {
        name: 'branching',
        edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'E']] as [string, string, string?][],
        start: 'A',
        expected: ['A', 'B', 'C', 'D', 'E'],
      },
      {
        name: 'cycles',
        edges: cycleEdges,
        start: 'A',
        expected: ['A', 'B', 'C'],
      },
      {
        name: 'empty edges',
        edges: [] as [string, string, string?][],
        start: 'A',
        expected: ['A'],
      },
    ])('findAllDownstreamNodes: $name', ({ edges, start, expected }) => {
      const graph = createGraph(edges);
      expect(findAllDownstreamNodes(graph, start)).toEqual(new Set(expected));
    });

    it.each([
      {
        name: 'linear chain',
        edges: linearEdges,
        start: 'D',
        expected: ['D', 'C', 'B', 'A'],
      },
      {
        name: 'converging branches',
        edges: [['A', 'C'], ['B', 'C'], ['C', 'D']] as [string, string, string?][],
        start: 'D',
        expected: ['D', 'C', 'A', 'B'],
      },
      {
        name: 'cycles',
        edges: cycleEdges,
        start: 'A',
        expected: ['A', 'C', 'B'],
      },
      {
        name: 'empty edges',
        edges: [] as [string, string, string?][],
        start: 'A',
        expected: ['A'],
      },
    ])('findAllUpstreamNodes: $name', ({ edges, start, expected }) => {
      const graph = createGraph(edges);
      expect(findAllUpstreamNodes(graph, start)).toEqual(new Set(expected));
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
    it.each([
      {
        name: 'both error and success inputs',
        edges: [['A', 'C', 'main'], ['B', 'C', 'error']] as [string, string, string?][],
        target: 'C',
        expected: true,
      },
      {
        name: 'single input',
        edges: [['A', 'B']] as [string, string, string?][],
        target: 'B',
        expected: false,
      },
      {
        name: 'multiple success inputs only',
        edges: [['A', 'C', 'main'], ['B', 'C', 'main']] as [string, string, string?][],
        target: 'C',
        expected: false,
      },
    ])('should return $expected for $name', ({ edges, target, expected }) => {
      const graph = createGraph(edges);
      expect(isRejoinNode(graph, target)).toBe(expected);
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
