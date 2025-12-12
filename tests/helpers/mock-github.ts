import type { Octokit } from 'octokit';
import { vi } from 'vitest';

/**
 * Mock GitHub API configuration for the standard handler.
 */
export type MockOctokitConfig = {
  checkRunId?: number;
  prFiles?: any[];
  fileContents?: Map<string, string>;
  configContent?: string | null;
  shouldFailCheckRunCreation?: boolean;
  shouldFailFilesFetch?: boolean;
  shouldTimeout?: boolean;
  shouldRateLimit?: boolean;
  existingFlowLintChecks?: any[]; // Mock existing FlowLint check runs
};

type RequestHandler = (endpoint: string, options?: any) => Promise<any>;

/**
 * Creates a mocked Octokit client for testing GitHub API interactions.
 * This function can operate in two modes:
 * 1.  **Standard Mode:** If you pass a `MockOctokitConfig` object, it uses a built-in
 *     request handler that simulates common API calls based on the config.
 * 2.  **Advanced Mode:** If you pass a custom `RequestHandler` function, it uses that
 *     function to handle all requests, allowing for complex, stateful tests.
 *
 * @param configOrHandler - A configuration object or a custom request handler function.
 * @returns A mocked Octokit instance with tracking arrays for updates and creations.
 */
export function createMockOctokit(
  configOrHandler: MockOctokitConfig | RequestHandler = {}
): Octokit & { _checkRunUpdates: any[]; _createdCheckRuns: any[] } {
  const checkRunUpdates: any[] = [];
  const createdCheckRuns: any[] = [];

  let requestHandler: RequestHandler;

  if (typeof configOrHandler === 'function') {
    // Advanced Mode: Use the provided request handler
    requestHandler = configOrHandler;
  } else {
    // Standard Mode: Use the built-in handler based on config
    const config: MockOctokitConfig = {
      checkRunId: 12345,
      prFiles: [],
      fileContents: new Map(),
      configContent: null,
      existingFlowLintChecks: [],
      ...configOrHandler,
    };

    requestHandler = async (endpoint: string, options?: any) => {
      if (config.shouldTimeout) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        throw new Error('Request timeout');
      }
      if (config.shouldRateLimit) {
        const error: any = new Error('API rate limit exceeded');
        error.status = 403;
        error.response = { headers: { 'x-ratelimit-remaining': '0' } };
        throw error;
      }
      if (endpoint === 'GET /repos/{owner}/{repo}/commits/{ref}/check-runs') {
        return { 
          data: { 
            check_runs: config.existingFlowLintChecks?.map(check => ({
              ...check,
              name: process.env.CHECK_NAME || 'FlowLint',
              head_sha: options.ref
            })) || []
          } 
        };
      }
      if (endpoint === 'POST /repos/{owner}/{repo}/check-runs') {
        if (config.shouldFailCheckRunCreation) throw new Error('Failed to create check run');
        const checkRun = { id: config.checkRunId, ...options };
        createdCheckRuns.push(checkRun);
        return { data: checkRun };
      }
      if (endpoint === 'PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}') {
        checkRunUpdates.push({ check_run_id: options.check_run_id, ...options });
        return { data: { id: options.check_run_id } };
      }
      if (endpoint === 'GET /repos/{owner}/{repo}/pulls/{pull_number}/files') {
        if (config.shouldFailFilesFetch) throw new Error('Failed to fetch PR files');
        return config.prFiles;
      }
      if (endpoint === 'GET /repos/{owner}/{repo}/git/blobs/{file_sha}') {
        const content = config.fileContents!.get(options.file_sha);
        if (!content) {
          const error: any = new Error('Not Found');
          error.status = 404;
          throw error;
        }
        return { data: { content: Buffer.from(content).toString('base64') } };
      }
      if (endpoint === 'GET /repos/{owner}/{repo}/contents/{path}' && options.path === '.flowlint.yml') {
        if (!config.configContent) {
          const error: any = new Error('Not Found');
          error.status = 404;
          throw error;
        }
        return { data: { content: Buffer.from(config.configContent).toString('base64') } };
      }
      throw new Error(`Unmocked endpoint: ${endpoint}`);
    };
  }

  const mockOctokit = {
    request: vi.fn(requestHandler),
    paginate: vi.fn(async (endpoint: string, options: any) => {
      // The standard handler for paginate is simple; advanced tests can mock it directly if needed.
      if (typeof configOrHandler !== 'function' && endpoint === 'GET /repos/{owner}/{repo}/pulls/{pull_number}/files') {
        return configOrHandler.prFiles || [];
      }
      return [];
    }),
    _checkRunUpdates: checkRunUpdates,
    _createdCheckRuns: createdCheckRuns,
  } as unknown as Octokit & { _checkRunUpdates: any[]; _createdCheckRuns: any[] };

  return mockOctokit;
}