import { vi, expect } from 'vitest';
import type { Octokit } from 'octokit';
import { ValidationError } from '../../packages/review/schemas';

/**
 * Common test utilities for E2E integration tests
 */

/**
 * Creates a mock job payload for review processing
 */
export function createMockJob(overrides: Partial<ReviewJob> = {}): ReviewJob {
  return {
    installationId: 123456,
    repo: 'owner/repo',
    prNumber: 1,
    sha: 'abc123',
    checkSuiteId: 999,
    ...overrides,
  };
}

export type ReviewJob = {
  installationId: number;
  repo: string;
  prNumber: number;
  sha: string;
  checkSuiteId?: number;
};

/**
 * Splits a repo string into owner and repo parts
 */
export function parseRepo(repo: string): [string, string] {
  const [owner, name] = repo.split('/');
  return [owner, name];
}

/**
 * Common module imports for E2E tests
 * Reduces duplication of repeated dynamic imports
 */
export async function importE2EModules() {
  const [githubClient, configModule, snifferModule, parserModule, rulesModule, reporterModule] =
    await Promise.all([
      import('../../packages/github/client'),
      import('../../packages/config/flowlint-config'),
      import('../../packages/review/sniffer'),
      import('../../packages/review/parser-n8n'),
      import('../../packages/review/rules'),
      import('../../packages/review/reporter'),
    ]);

  return {
    githubClient,
    configModule,
    snifferModule,
    parserModule,
    rulesModule,
    reporterModule,
  };
}

/**
 * Options for the E2E test runner
 */
export type E2ETestOptions = {
  prFiles: Array<{ filename: string; status: string; sha: string }>;
  fileContents: Map<string, string>;
  configContent?: string;
  jobOverrides?: Partial<ReviewJob>;
  mockConfig?: any; // Additional mock configuration
  testAssertions: (
    result: {
      findings: any[];
      conclusion: string;
      output: any;
      targets: any[];
      mockOctokit: Octokit & { _checkRunUpdates: any[]; _createdCheckRuns: any[] };
    }
  ) => void | Promise<void>;
};

/**
 * Runs a full E2E test scenario.
 * This function encapsulates the entire workflow from receiving a job to completing a Check Run.
 * It is designed to be highly customizable through the options parameter.
 *
 * @param options - The configuration for the test run.
 */
export async function runE2ETest(options: E2ETestOptions): Promise<void> {
  const { createMockOctokit } = await import('./mock-github');
  const {
    githubClient,
    configModule,
    snifferModule,
    parserModule,
    rulesModule,
    reporterModule,
  } = await importE2EModules();

  // 1. Setup mock GitHub client
  const mockOctokit = createMockOctokit({
    prFiles: options.prFiles,
    fileContents: options.fileContents,
    configContent: options.configContent,
    ...options.mockConfig,
  }) as any;

  vi.spyOn(githubClient, 'getInstallationClient').mockResolvedValue(mockOctokit);

  // 2. Simulate worker processing
  const job = createMockJob(options.jobOverrides);
  const gh = await githubClient.getInstallationClient(job.installationId);
  const [owner, repo] = parseRepo(job.repo);

  // 2.5. Get existing FlowLint checks (simulate worker logic)
  const { data: commitChecks } = await gh.request('GET /repos/{owner}/{repo}/commits/{ref}/check-runs', {
    owner,
    repo,
    ref: job.sha,
  });
  const previousRuns = commitChecks.check_runs?.filter(
    (run: any) => run.name === (process.env.CHECK_NAME || 'FlowLint') && run.head_sha === job.sha,
  ) ?? [];

  // 3. Create 'in_progress' check run
  const { data: check } = await gh.request('POST /repos/{owner}/{repo}/check-runs', {
    owner,
    repo,
    name: 'FlowLint',
    head_sha: job.sha,
    status: 'in_progress',
    started_at: new Date().toISOString(),
    check_suite_id: job.checkSuiteId,
  });

  // 4. Fetch files and config
  const allFiles = await (gh as any).paginate('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
    owner,
    repo,
    pull_number: job.prNumber,
    per_page: 100,
  });

  const cfg = await configModule.loadConfig(gh, job.repo, job.sha);
  const targets = snifferModule.pickTargets(allFiles, cfg.files);

  // 5. Fetch, parse, and run rules
  const { contents: rawFiles, errors: fetchErrors } = await snifferModule.fetchRawFiles(gh, job.repo, targets);

  const allFindings: any[] = fetchErrors.map(e => ({
    rule: 'FETCH',
    severity: 'must',
    path: e.filename,
    message: `Failed to fetch file content: ${e.error}`,
  }));

  for (const target of targets) {
    const raw = rawFiles.get(target.filename);
    if (!raw) continue;

    try {
      const graph = parserModule.parseN8n(raw);
      const findings = rulesModule.runAllRules(graph, {
        path: target.filename,
        cfg,
        nodeLines: (graph.meta?.nodeLines as Record<string, number>) || {},
      });
      allFindings.push(...findings);
    } catch (error: any) {
      allFindings.push({
        rule: 'PARSE',
        severity: 'must',
        path: target.filename,
        message: `Failed to parse workflow: ${error.message}`,
        line: 1,
      });
    }
  }

  // 6. Build output and complete check run (simulate worker logic)
  let conclusion, output;
  
  if (targets.length === 0) {
    // Simulate worker logic for no target files
    const result = reporterModule.buildCheckOutput({ 
      findings: [], 
      cfg,
      conclusionOverride: 'neutral'
    });
    conclusion = 'neutral';
    output = {
      title: 'No relevant files found',
      summary: 'No workflow files were found to analyze in this pull request.',
    };
  } else {
    // Normal case: use findings to determine conclusion
    const result = reporterModule.buildCheckOutput({ findings: allFindings, cfg });
    conclusion = result.conclusion;
    output = result.output;
  }

  await gh.request('PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}', {
    owner,
    repo,
    check_run_id: check.id,
    status: 'completed',
    conclusion,
    completed_at: new Date().toISOString(),
    output,
  });

  // 6.5. Mark older FlowLint runs as superseded (simulate worker logic)
  await Promise.all(
    previousRuns.map(async (run: any) => {
      try {
        await gh.request('PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}', {
          owner,
          repo,
          check_run_id: run.id,
          status: 'completed',
          conclusion: 'neutral',
          completed_at: new Date().toISOString(),
          output: {
            title: 'Superseded by newer FlowLint run',
            summary: `This run has been replaced by FlowLint check ${check.id}. See the latest run for up-to-date findings.`,
          },
        });
      } catch (supersedeError) {
        // In tests, we can ignore supersede errors
        console.warn('Failed to mark older run as superseded:', supersedeError);
      }
    }),
  );

  // 7. Run test-specific assertions
  await options.testAssertions({
    findings: allFindings,
    conclusion,
    output,
    targets,
    mockOctokit,
  });
}

/**
 * Creates a GitHub rate limit error object
 */
export function createRateLimitError(retryAfter?: number): any {
  const error: any = new Error('API rate limit exceeded');
  error.status = 403;

  if (retryAfter !== undefined) {
    error.response = {
      headers: {
        'x-ratelimit-remaining': '0',
        'retry-after': String(retryAfter),
      },
    };
  } else {
    error.response = {
      headers: {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
      },
    };
  }

  return error;
}

/**
 * Creates a graceful shutdown handler with timeout
 */
export function createGracefulShutdown(shutdownTimeoutMs: number) {
  return async (jobPromise: Promise<void>) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), shutdownTimeoutMs);
    });

    try {
      await Promise.race([jobPromise, timeoutPromise]);
    } catch (error) {
      return { forcedKill: true };
    }

    return { forcedKill: false };
  };
}

/**
 * Generates large workflow nodes for testing file size limits
 */
export function generateLargeWorkflowNodes(nodeCount: number, paramValueSize: number = 300) {
  return Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    type: 'n8n-nodes-base.set',
    name: `Set ${i}`,
    parameters: { value: 'x'.repeat(paramValueSize) },
  }));
}

/**
 * Generates mock findings for testing annotation limits
 */
export function generateMockFindings(count: number, rule: string, severity: 'must' | 'should' | 'nit', path: string = 'workflows/test.json') {
  return Array.from({ length: count }, (_, i) => ({
    rule,
    severity,
    path,
    message: `Finding ${i}`,
    line: i + 1,
  }));
}

/**
 * Helper function to test ValidationError throws
 * Reduces duplication in schema validation tests
 *
 * @param fn - Function that should throw ValidationError
 * @param expectedSubstrings - Array of strings that should appear in error messages
 */
export function expectValidationError(fn: () => void, expectedSubstrings: string[]): void {
  try {
    fn();
    expect.fail('Should have thrown ValidationError');
  } catch (error: any) {
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toBeDefined();

    for (const substring of expectedSubstrings) {
      const found = error.errors.some((e: any) =>
        e.message.includes(substring) || e.path.includes(substring) || e.suggestion?.includes(substring)
      );
      expect(found).toBe(true);
    }
  }
}
