import { describe, it, expect } from 'vitest';
import { parseN8n } from '../src/parser/parser-n8n';
import { ValidationError } from '../packages/review/schemas';
import { expectValidationError } from './helpers/test-utils';

// Test workflow factory functions to reduce duplication
function createMinimalWorkflow(overrides: any = {}) {
  return JSON.stringify({
    nodes: [
      { id: 'node1', type: 'n8n-nodes-base.start', name: 'Start' },
      { id: 'node2', type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request' },
    ],
    connections: {
      node1: {
        main: [[{ node: 'node2', type: 'main', index: 0 }]],
      },
    },
    ...overrides,
  });
}

function createWorkflowWithNodes(nodes: any[], connections: any = {}) {
  return JSON.stringify({ nodes, connections });
}

function createCompleteWorkflow(overrides: any = {}) {
  return JSON.stringify({
    name: 'Test Workflow',
    active: true,
    nodes: [
      {
        id: 'node1',
        type: 'n8n-nodes-base.start',
        name: 'Start',
        position: [100, 200],
        parameters: {},
        credentials: {},
        continueOnFail: false,
        disabled: false,
        typeVersion: 1,
      },
    ],
    connections: {},
    settings: {},
    tags: ['test'],
    ...overrides,
  });
}

// Common test assertion patterns
function assertValidWorkflow(workflow: string, expectedNodeCount: number, expectedEdgeCount: number = 0) {
  const graph = parseN8n(workflow);
  expect(graph.nodes).toHaveLength(expectedNodeCount);
  expect(graph.edges).toHaveLength(expectedEdgeCount);
  return graph;
}

function assertInvalidWorkflow(workflow: string, expectedSubstrings: string[]) {
  expect(() => parseN8n(workflow)).toThrow(ValidationError);
  expectValidationError(() => parseN8n(workflow), expectedSubstrings);
}

describe('Schema Validation', () => {
  describe('Valid workflows', () => {
    it('should parse a minimal valid workflow', () => {
      const workflow = createMinimalWorkflow();
      assertValidWorkflow(workflow, 2, 1);
    });

    it('should parse workflow with all optional fields', () => {
      const workflow = createCompleteWorkflow();
      assertValidWorkflow(workflow, 1, 0);
    });
  });

  describe('Missing required fields', () => {
    it.each([
      {
        testName: 'workflow without nodes field',
        workflow: { connections: {} },
        expectedError: 'nodes',
      },
      {
        testName: 'workflow without connections field',
        workflow: { nodes: [{ id: 'node1', type: 'n8n-nodes-base.start', name: 'Start' }] },
        expectedError: 'connections',
      },
      {
        testName: 'node without type field',
        workflow: { nodes: [{ id: 'node1', name: 'Start' }], connections: {} },
        expectedError: 'type',
      },
      {
        testName: 'node without name field',
        workflow: { nodes: [{ id: 'node1', type: 'n8n-nodes-base.start' }], connections: {} },
        expectedError: 'name',
      },
    ])('should reject $testName', ({ workflow, expectedError }) => {
      const workflowStr = JSON.stringify(workflow);
      assertInvalidWorkflow(workflowStr, [expectedError]);
    });

    it('should allow node without id field', () => {
      const workflow = createWorkflowWithNodes([
        { type: 'n8n-nodes-base.start', name: 'Start' },
        { id: 'node2', type: 'n8n-nodes-base.httpRequest', name: 'HTTP' },
      ]);
      expect(() => parseN8n(workflow)).not.toThrow();
    });

    it('should allow tags defined as objects', () => {
      const workflow = JSON.stringify({
        nodes: [{ type: 'n8n-nodes-base.start', name: 'Start' }],
        connections: {},
        tags: [{ id: 'tag1', name: 'domy' }],
      });
      expect(() => parseN8n(workflow)).not.toThrow();
    });
  });

  describe('Duplicate node IDs', () => {
    it('should reject workflow with duplicate node IDs', () => {
      const workflow = createWorkflowWithNodes([
        { id: 'duplicate', type: 'n8n-nodes-base.start', name: 'Start 1' },
        { id: 'duplicate', type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request' },
      ]);
      assertInvalidWorkflow(workflow, ['Duplicate node ID', 'duplicate']);
    });

    it('should reject workflow with multiple duplicate node IDs', () => {
      const workflow = createWorkflowWithNodes([
        { id: 'dup1', type: 'n8n-nodes-base.start', name: 'Start 1' },
        { id: 'dup1', type: 'n8n-nodes-base.httpRequest', name: 'HTTP 1' },
        { id: 'dup2', type: 'n8n-nodes-base.code', name: 'Code 1' },
        { id: 'dup2', type: 'n8n-nodes-base.code', name: 'Code 2' },
      ]);
      assertInvalidWorkflow(workflow, ['dup1', 'dup2']);
    });
  });

  describe('Orphaned connections', () => {
    it.each([
      {
        testName: 'connection to non-existent node',
        connections: {
          node1: {
            main: [[{ node: 'nonexistent', type: 'main', index: 0 }]],
          },
        },
      },
      {
        testName: 'connection from non-existent node',
        connections: {
          nonexistent: {
            main: [[{ node: 'node1', type: 'main', index: 0 }]],
          },
        },
      },
    ])('should reject workflow with $testName', ({ connections }) => {
      const workflow = createWorkflowWithNodes(
        [{ id: 'node1', type: 'n8n-nodes-base.start', name: 'Start' }],
        connections
      );
      assertInvalidWorkflow(workflow, ['Orphaned connection', 'nonexistent']);
    });

    it('should accept connections using node names instead of IDs', () => {
      const workflow = createWorkflowWithNodes([
        { id: 'uuid1', type: 'n8n-nodes-base.start', name: 'Start' },
        { id: 'uuid2', type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request' },
      ], {
        Start: {
          main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
        },
      });
      assertValidWorkflow(workflow, 2, 1);
    });
  });

  describe('Error messages', () => {
    it('should provide helpful error message with suggestion for missing field', () => {
      const workflow = JSON.stringify({
        nodes: [],
      });
      expectValidationError(() => parseN8n(workflow), ['connections']);

      try {
        parseN8n(workflow);
      } catch (error: any) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('Workflow validation failed');
        expect(error.errors[0]).toHaveProperty('path');
        expect(error.errors[0]).toHaveProperty('message');
        expect(error.errors[0]).toHaveProperty('suggestion');
      }
    });

    it('should include multiple errors when validation fails in multiple places', () => {
      const workflow = createWorkflowWithNodes([
        { id: 'node1', type: 'n8n-nodes-base.start', name: 'Start' },
        { id: 'node2', type: 'n8n-nodes-base.httpRequest', name: 'HTTP' },
      ], {
        node1: {
          main: [[{ node: 'missing1', type: 'main', index: 0 }]],
        },
        node2: {
          main: [[{ node: 'missing2', type: 'main', index: 0 }]],
        },
      });
      assertInvalidWorkflow(workflow, ['missing1', 'missing2']);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty nodes array', () => {
      const workflow = createWorkflowWithNodes([]);
      assertValidWorkflow(workflow, 0, 0);
    });

    it('should handle empty connections object', () => {
      const workflow = createWorkflowWithNodes([
        { id: 'node1', type: 'n8n-nodes-base.start', name: 'Start' }
      ]);
      assertValidWorkflow(workflow, 1, 0);
    });

    it('should handle YAML format workflows', () => {
      const workflow = `
nodes:
  - id: node1
    type: n8n-nodes-base.start
    name: Start
  - id: node2
    type: n8n-nodes-base.httpRequest
    name: HTTP Request
connections:
  node1:
    main:
      - - node: node2
          type: main
          index: 0
`;
      assertValidWorkflow(workflow, 2, 1);
    });

    it('should handle nested connection arrays', () => {
      const workflow = createWorkflowWithNodes([
        { id: 'node1', type: 'n8n-nodes-base.start', name: 'Start' },
        { id: 'node2', type: 'n8n-nodes-base.httpRequest', name: 'HTTP' },
        { id: 'node3', type: 'n8n-nodes-base.code', name: 'Code' },
      ], {
        node1: {
          main: [
            [
              { node: 'node2', type: 'main', index: 0 },
              { node: 'node3', type: 'main', index: 0 },
            ],
          ],
        },
      });
      assertValidWorkflow(workflow, 3, 2);
    });
  });
});
