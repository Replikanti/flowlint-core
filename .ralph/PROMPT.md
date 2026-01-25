# Ralph Loop - FlowLint Core

## Task

Development and maintenance of FlowLint Core - the core TypeScript library for parsing n8n workflows and linting rules.

## Completion Criteria

- [ ] Parser correctly parses n8n JSON/YAML workflows
- [ ] All 14 rules (R1-R14) work correctly
- [ ] Tests pass with >90% coverage
- [ ] Build generates dual CJS/ESM output
- [ ] Documentation is up to date

## Max Iterations

10

## Context Files

- CLAUDE.md - Main project instructions
- README.md - Package documentation
- src/index.ts - Main export
- src/parser/ - Parser implementation
- src/rules/ - Linting rules
- tests/ - Test suite

## Notes

FlowLint Core is the foundation of the entire ecosystem. All changes here affect other components (CLI, GitHub App, Web, Chrome Extension, etc.).

When making changes:
- Preserve backward compatibility
- Dual CJS/ESM build is critical
- Test on real n8n workflows from flowlint-examples
