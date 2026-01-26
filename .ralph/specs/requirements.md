# FlowLint Core - Technical Requirements

## Overview

Core TypeScript library for n8n workflow static analysis. Published as `@replikanti/flowlint-core` on npm.

## Core Functionality

### Parser
- Parse n8n JSON workflow format
- Parse n8n YAML workflow format  
- Transform to internal Graph representation
- Maintain line number mapping for error reporting
- JSON schema validation

### Graph Model
- **NodeRef**: Workflow node with id, type, name, params, credentials, retry config
- **Edge**: Connection between nodes (success, error, timeout paths)
- **Graph**: Complete workflow representation (nodes + edges + metadata)

### Rules Engine
- 14 built-in rules (R1-R14)
- Rule severity levels: must, should, nit
- RuleRunner interface: `(graph, ctx) => Finding[]`
- Rule metadata with documentation URLs
- Configurable via `.flowlint.yml`

### Utility Functions
- Node type detection (API, mutation, notification, terminal, error-prone)
- Rule helper factories (createNodeRule, createHardcodedStringRule)
- Documentation link generation

### Reporter
- GitHub Check Run annotation format
- Line number resolution
- Severity mapping

## Technical Constraints

- Node.js >= 24.12.0
- TypeScript strict mode
- Dual CJS/ESM distribution
- Zero runtime dependencies (dev deps only)
- Tree-shakeable exports

## Build Output

- `dist/index.js` - CommonJS build
- `dist/index.mjs` - ESM build
- `dist/index.d.ts` - TypeScript declarations

## Testing Requirements

- Vitest test framework
- >90% code coverage
- Test fixtures for each rule
- Parser tests for JSON and YAML

## API Stability

- Public API must remain backward compatible
- Breaking changes require major version bump
- Internal APIs can change freely
