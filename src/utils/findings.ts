/**
 * Findings utilities
 * Shared logic for processing and analyzing findings across both review engine and CLI
 */

import type { Finding } from '../types';

export interface FindingsSummary {
  must: number;
  should: number;
  nit: number;
  total: number;
}

/**
 * Count findings by severity level
 */
export function countFindingsBySeverity(findings: Finding[]): FindingsSummary {
  return {
    must: findings.filter((f) => f.severity === 'must').length,
    should: findings.filter((f) => f.severity === 'should').length,
    nit: findings.filter((f) => f.severity === 'nit').length,
    total: findings.length,
  };
}

/**
 * Get severity order for sorting
 */
export function getSeverityOrder(): Record<string, number> {
  return { must: 0, should: 1, nit: 2 };
}

/**
 * Sort findings by severity
 */
export function sortFindingsBySeverity(findings: Finding[]): Finding[] {
  const order = getSeverityOrder();
  return [...findings].sort((a, b) => order[a.severity] - order[b.severity]);
}
