import type { Graph } from '../../packages/review/types';

const STOP_AND_ERROR_WORKFLOW = Object.freeze({
  nodes: [
    {
      id: 'Get Installation Token',
      type: 'n8n-nodes-base.httpRequest',
      name: 'Get Installation Token',
      parameters: {},
    },
    {
      id: 'Success Handler',
      type: 'n8n-nodes-base.set',
      name: 'Success Handler',
      parameters: {},
    },
    {
      id: 'Stop and Error1',
      type: 'n8n-nodes-base.stopAndError',
      name: 'Stop and Error1',
      parameters: {},
    },
  ],
  connections: {
    'Get Installation Token': {
      main: [
        [{ node: 'Success Handler', type: 'main', index: 0 }],
        [{ node: 'Stop and Error1', type: 'main', index: 0 }],
      ],
    },
  },
} as const);

const STOP_AND_ERROR_GRAPH: Graph = {
  nodes: [
    { id: 'A', type: 'httpRequest' },
    { id: 'handler', type: 'n8n-nodes-base.stopAndError', name: 'Stop and Error' },
  ],
  edges: [{ from: 'A', to: 'handler', on: 'error' }],
  meta: {},
};

export const stopAndErrorNodeIds = Object.freeze({
  request: 'Get Installation Token',
  success: 'Success Handler',
  error: 'Stop and Error1',
});

export type StopAndErrorWorkflow = typeof STOP_AND_ERROR_WORKFLOW;

export function buildStopAndErrorWorkflowFixture(): StopAndErrorWorkflow {
  return structuredClone(STOP_AND_ERROR_WORKFLOW) as StopAndErrorWorkflow;
}

export function buildStopAndErrorGraphFixture(): Graph {
  return structuredClone(STOP_AND_ERROR_GRAPH) as Graph;
}

export function buildErrorWorkflowFixture(errorHandlerType: string, errorHandlerName: string, errorHandlerParams: Record<string, any> = {}) {
  return {
    nodes: [
      {
        id: 'Get Installation Token',
        type: 'n8n-nodes-base.httpRequest',
        name: 'Get Installation Token',
        parameters: {},
      },
      {
        id: 'Success Handler',
        type: 'n8n-nodes-base.set',
        name: 'Success Handler',
        parameters: {},
      },
      {
        id: errorHandlerName,
        type: errorHandlerType,
        name: errorHandlerName,
        parameters: errorHandlerParams,
      },
    ],
    connections: {
      'Get Installation Token': {
        main: [
          [{ node: 'Success Handler', type: 'main', index: 0 }],
          [{ node: errorHandlerName, type: 'main', index: 0 }],
        ],
      },
    },
  };
}
