/**
 * Provider Interfaces for FlowLint
 *
 * These abstractions decouple the core linting engine from specific data sources
 * and output formats, allowing FlowLint to be used in multiple contexts:
 * - GitHub App (existing)
 * - CLI (local file analysis)
 * - Future: Web Dashboard, CI/CD integrations
 */

import type { Finding, Graph } from '../types';
import type { FlowLintConfig } from '../config';

// Re-export Finding for use by consumers
export type { Finding } from '../types';

/**
 * LintableFile represents a single file that can be analyzed.
 * This replaces the GitHub-specific PRFile type for core linting operations.
 */
export interface LintableFile {
  path: string;
  content: string;
}

/**
 * FileSource provides files for analysis.
 * Implementations can read from:
 * - Local filesystem (for CLI)
 * - GitHub PR (for App)
 * - Any other source
 */
export interface FileSource {
  /**
   * Get files matching the provided glob patterns.
   * @param patterns Include/ignore patterns
   * @returns Array of lintable files
   */
  getFiles(patterns: { include: string[]; ignore: string[] }): Promise<LintableFile[]>;
}

/**
 * ConfigProvider loads FlowLint configuration.
 * Implementations can load from:
 * - Local .flowlint.yml file (for CLI)
 * - Remote GitHub repository (for App)
 * - Default/hardcoded configuration
 */
export interface ConfigProvider {
  /**
   * Load the FlowLint configuration.
   * Should return merged config (defaults + overrides).
   * @returns Loaded configuration
   */
  load(): Promise<FlowLintConfig>;
}

/**
 * Reporter generates output from analysis results.
 * Implementations can output to:
 * - GitHub Checks API (for App)
 * - Console/table (for CLI)
 * - JSON file (for integrations/Web Dashboard)
 */
export interface Reporter {
  /**
   * Report analysis results.
   * @param results Array of findings from all files
   * @returns Promise that resolves when reporting is complete
   */
  report(results: AnalysisResult[]): Promise<void>;
}

/**
 * AnalysisResult represents the findings for a single analyzed file.
 * This is the data structure passed to reporters.
 */
export interface AnalysisResult {
  file: LintableFile;
  graph: Graph;
  findings: Finding[];
  errors?: Array<{ error: string; details?: string }>;
}

/**
 * AnalysisEngine orchestrates the linting process.
 * It coordinates file source, config loading, rule execution, and reporting.
 */
export interface AnalysisEngine {
  /**
   * Run a complete analysis on the provided scope.
   * @returns Summary of the analysis (e.g., total findings, errors)
   */
  analyze(): Promise<AnalysisSummary>;
}

/**
 * Summary of a completed analysis.
 */
export interface AnalysisSummary {
  totalFiles: number;
  totalFindings: number;
  findingsBySeverity: {
    must: number;
    should: number;
    nit: number;
  };
  errors: number;
  hasBlockingIssues: boolean; // Whether any 'must' severity findings exist
}

