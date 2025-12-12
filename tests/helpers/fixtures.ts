/**
 * Shared test fixtures for E2E integration tests
 * Contains sample n8n workflow JSON structures with known patterns
 */

// Happy path: valid workflow with proper error handling and webhook acknowledgment (R13)
export const validWorkflow = JSON.stringify({
  nodes: [
    {
      id: '1',
      type: 'n8n-nodes-base.webhook',
      name: 'Webhook Trigger',
      parameters: { body: { eventId: '{{ $json.id }}' } },
    },
    {
      id: '2',
      type: 'n8n-nodes-base.respondToWebhook',
      name: 'Respond to Webhook',
      parameters: { respondWith: 'text', responseBody: 'OK' },
    },
    {
      id: '3',
      type: 'n8n-nodes-base.httpRequest',
      name: 'Fetch User Data',
      parameters: { url: '{{ $env.API_URL }}/users', options: { retryOnFail: true } },
    },
    {
      id: '4',
      type: 'n8n-nodes-base.slack',
      name: 'Error Handler',
      parameters: { text: 'Error occurred' },
    },
  ],
  connections: {
    'Webhook Trigger': { main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]] },
    'Respond to Webhook': { main: [[{ node: 'Fetch User Data', type: 'main', index: 0 }]] },
    'Fetch User Data': { error: [[{ node: 'Error Handler', type: 'main', index: 0 }]] },
  },
});

// R2 violation: continueOnFail enabled (should fail check)
export const continueOnFailWorkflow = JSON.stringify({
  nodes: [
    {
      id: '1',
      type: 'n8n-nodes-base.set',
      name: 'Unsafe Node',
      parameters: {},
      continueOnFail: true,
    },
  ],
  connections: {},
});

// R4 violation: hardcoded secret
export const secretLeakWorkflow = JSON.stringify({
  nodes: [
    {
      id: '1',
      type: 'n8n-nodes-base.httpRequest',
      name: 'API Call',
      parameters: {
        url: 'https://api.example.com',
        headers: { Authorization: 'Bearer sk-secret-key-12345' },
      },
    },
  ],
  connections: {},
});

// R12 violation: unhandled error path
export const unhandledErrorWorkflow = JSON.stringify({
  nodes: [
    {
      id: '1',
      type: 'n8n-nodes-base.httpRequest',
      name: 'Risky API Call',
      parameters: { url: 'https://api.example.com' },
    },
  ],
  connections: {},
});

// Malformed JSON
export const malformedWorkflow = '{ invalid json content';

// Multiple rule violations
export const multipleViolationsWorkflow = JSON.stringify({
  nodes: [
    { id: '1', type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request', parameters: {} }, // R10, R12
    { id: '2', type: 'n8n-nodes-base.set', name: 'Set', continueOnFail: true }, // R2, R10
  ],
  connections: {},
});

// Realistic n8n export where node IDs are omitted
export const workflowWithoutIds = JSON.stringify({
  nodes: [
    {
      type: 'n8n-nodes-base.httpRequest',
      name: 'Fetch Deals',
      parameters: { url: 'https://example.com' },
    },
    {
      type: 'n8n-nodes-base.set',
      name: 'Transform Data',
      parameters: {},
    },
  ],
  connections: {
    'Fetch Deals': { main: [[{ node: 'Transform Data', type: 'main', index: 0 }]] },
  },
  tags: [
    {
      id: 'abc123',
      name: 'deals'
    },
  ],
});

export const workflowWithObjectTags = JSON.stringify({
  nodes: [
    { type: 'n8n-nodes-base.httpRequest', name: 'Fetch', parameters: {} },
  ],
  connections: {},
  tags: [
    {
      id: 'tag1',
      name: 'domy',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ],
});
