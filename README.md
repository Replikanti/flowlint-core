# @flowlint/core

Core linting engine for n8n workflows. This package provides the fundamental building blocks for analyzing and validating n8n workflow files.

## Installation

```bash
npm install @flowlint/core
```

## Usage

```typescript
import { parseN8n, runAllRules, loadConfig, defaultConfig } from '@flowlint/core';

// Parse a workflow from JSON string
const workflow = parseN8n(workflowJsonString);

// Run all linting rules
const findings = runAllRules(workflow, {
  path: 'my-workflow.n8n.json',
  cfg: defaultConfig,
});

// Process findings
findings.forEach(finding => {
  console.log([${finding.severity.toUpperCase()}] ${finding.rule}: ${finding.message});
});
```

## API

### Parser

- `parseN8n(doc: string): Graph` - Parse n8n workflow JSON/YAML into a graph structure

### Linting

- `runAllRules(graph: Graph, ctx: RuleContext): Finding[]` - Run all enabled rules

### Configuration

- `loadConfig(configPath?: string): FlowLintConfig` - Load configuration from file
- `defaultConfig: FlowLintConfig` - Default configuration
- `parseConfig(content: string): FlowLintConfig` - Parse config from YAML string

### Validation

- `validateN8nWorkflow(data: unknown): void` - Validate workflow structure

## Rules

This package includes 14 built-in rules:

| Rule | Description | Severity |
|------|-------------|----------|
| R1 | Rate limit retry | must |
| R2 | Error handling | must |
| R3 | Idempotency | should |
| R4 | Secrets exposure | must |
| R5 | Dead ends | nit |
| R6 | Long running | should |
| R7 | Alert/log enforcement | should |
| R8 | Unused data | nit |
| R9 | Config literals | should |
| R10 | Naming convention | nit |
| R11 | Deprecated nodes | should |
| R12 | Unhandled error path | must |
| R13 | Webhook acknowledgment | must |
| R14 | Retry-After compliance | should |

## License

MIT
