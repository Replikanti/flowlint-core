import type { Finding } from '../types';
import type { FlowLintConfig } from '../config';

type Conclusion = 'action_required' | 'neutral' | 'success' | 'failure';

export function buildCheckOutput({
  findings,
  cfg,
  summaryOverride,
  conclusionOverride,
}: {
  findings: Finding[];
  cfg: FlowLintConfig;
  summaryOverride?: string;
  conclusionOverride?: Conclusion;
}) {
  const summary = summaryOverride ?? summarize(findings);
  const conclusion = conclusionOverride ?? inferConclusion(findings);

  return {
    conclusion,
    output: {
      title: process.env.CHECK_TITLE || 'FlowLint findings',
      summary,
    },
  };
}

export function buildAnnotations(findings: Finding[]): any[] {
  const severityOrder: Finding['severity'][] = ['must', 'should', 'nit'];
  const ordered = [...findings].sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  return ordered.map((finding) => {
    const line = finding.line ?? 1;

    // Build raw_details with optional documentation URL
    let rawDetails = finding.raw_details;
    if (finding.documentationUrl) {
      const docLine = `See examples: ${finding.documentationUrl}`;
      rawDetails = rawDetails ? `${docLine}\n\n${rawDetails}` : docLine;
    }

    return {
      path: finding.path,
      start_line: line,
      end_line: line,
      annotation_level: mapSeverity(finding.severity),
      message: `${finding.rule}: ${finding.message}`,
      raw_details: rawDetails?.slice(0, 64000),
    };
  });
}

function inferConclusion(findings: Finding[]): Conclusion {
  if (findings.some((f) => f.severity === 'must')) return 'failure';
  if (findings.some((f) => f.severity === 'should')) return 'neutral';
  return 'success';
}

function summarize(findings: Finding[]) {
  if (findings.length === 0) return 'No issues found.';
  const must = findings.filter((f) => f.severity === 'must').length;
  const should = findings.filter((f) => f.severity === 'should').length;
  const nit = findings.filter((f) => f.severity === 'nit').length;
  return `${must} must-fix, ${should} should-fix, ${nit} nit.`;
}

function mapSeverity(severity: Finding['severity']) {
  if (severity === 'must') return 'failure';
  if (severity === 'should') return 'warning';
  return 'notice';
}

