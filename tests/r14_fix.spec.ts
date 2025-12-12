import { describe, it, expect } from 'vitest';
import { runAllRules } from '../src/rules';
import { parseN8n } from '../src/parser/parser-n8n';

describe('R14: static wait fix', () => {
  it('passes HTTP node with static retry wait (integer)', () => {
    const json = JSON.stringify({
      nodes: [
        {
          id: '1',
          name: 'HTTP Request',
          type: 'n8n-nodes-base.httpRequest',
          parameters: {
              url: 'https://example.com'
          },
          retryOnFail: true,
          waitBetweenTries: 5000, // Static integer
          maxTries: 3
        }
      ],
      connections: {}
    });

    const graph = parseN8n(json);
    const findings = runAllRules(graph, {
      path: 'test.json',
      cfg: { rules: { retry_after_compliance: { enabled: true, severity: 'should' } } } as any
    });

    const r14Findings = findings.filter(f => f.rule === 'R14');
    expect(r14Findings).toHaveLength(0); // Should pass now
  });

  it('passes HTTP node with static retry wait (numeric string)', () => {
    const json = JSON.stringify({
      nodes: [
        {
          id: '1',
          name: 'HTTP Request',
          type: 'n8n-nodes-base.httpRequest',
           parameters: {
              url: 'https://example.com'
          },
          retryOnFail: true,
          waitBetweenTries: "5000", // Static string
          maxTries: 3
        }
      ],
      connections: {}
    });

    const graph = parseN8n(json);
    const findings = runAllRules(graph, {
        path: 'test.json',
        cfg: { rules: { retry_after_compliance: { enabled: true, severity: 'should' } } } as any
    });

    const r14Findings = findings.filter(f => f.rule === 'R14');
    expect(r14Findings).toHaveLength(0);
  });
});
