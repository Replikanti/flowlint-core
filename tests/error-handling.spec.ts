import { describe, it, expect, vi } from 'vitest';
import { fetchRawFiles } from '../src/sniffer';
import type { PRFile } from '../src/types';

describe('Error handling in fetchRawFiles', () => {
  it('continues processing when individual file fetch fails', async () => {
    const mockGh = {
      request: vi
        .fn()
        .mockResolvedValueOnce({
          data: { content: Buffer.from(JSON.stringify({ nodes: [], connections: {} })).toString('base64') },
        })
        .mockRejectedValueOnce(new Error('Request failed with status code 404'))
        .mockResolvedValueOnce({
          data: { content: Buffer.from(JSON.stringify({ nodes: [], connections: {} })).toString('base64') },
        }),
    };

    const targets: PRFile[] = [
      { filename: 'workflow-a.json', status: 'added', sha: 'sha1' },
      { filename: 'workflow-b.json', status: 'added', sha: 'sha2' },
      { filename: 'workflow-c.json', status: 'added', sha: 'sha3' },
    ];

    const { contents, errors } = await fetchRawFiles(mockGh as any, 'owner/repo', targets);

    expect(contents.size).toBe(2);
    expect(contents.has('workflow-a.json')).toBe(true);
    expect(contents.has('workflow-c.json')).toBe(true);
    expect(errors).toHaveLength(1);
    expect(errors[0].filename).toBe('workflow-b.json');
    expect(errors[0].error).toContain('404');
  });

  it('handles missing SHA gracefully', async () => {
    const mockGh = {
      request: vi.fn().mockResolvedValue({
        data: { content: Buffer.from('{}').toString('base64') },
      }),
    };

    const targets: PRFile[] = [
      { filename: 'workflow-a.json', status: 'added', sha: 'sha1' },
      { filename: 'workflow-b.json', status: 'removed' }, // No SHA for removed files
    ];

    const { contents, errors } = await fetchRawFiles(mockGh as any, 'owner/repo', targets);

    expect(contents.size).toBe(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].filename).toBe('workflow-b.json');
    expect(errors[0].error).toContain('Missing SHA');
  });

  it('returns empty result when all fetches fail', async () => {
    const mockGh = {
      request: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')),
    };

    const targets: PRFile[] = [
      { filename: 'workflow-a.json', status: 'added', sha: 'sha1' },
      { filename: 'workflow-b.json', status: 'added', sha: 'sha2' },
    ];

    const { contents, errors } = await fetchRawFiles(mockGh as any, 'owner/repo', targets);

    expect(contents.size).toBe(0);
    expect(errors).toHaveLength(2);
    expect(errors.every((e) => e.error.includes('rate limit'))).toBe(true);
  });
});
