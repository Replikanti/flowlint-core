# FlowLint Core Development Skill

## Metadata
- **Name:** flowlint-core-dev
- **License:** MIT
- **Compatibility:** Claude Code, Node.js 24+
- **Package:** @replikanti/flowlint-core

## Description

FlowLint Core is the heart of the entire ecosystem - a TypeScript library containing the parser and 14 built-in rules (R1-R14). It transforms n8n workflow files (JSON/YAML) into a graph structure and applies linting rules.

All other FlowLint components depend on this core package.

## Capabilities

- **add-rule:** Add new linting rule (R15+)
- **modify-parser:** Modify parser for new n8n versions
- **update-types:** Extend type system (Graph, NodeRef, Edge, Finding)
- **optimize-rules:** Optimize rule performance
- **fix-bug:** Fix bugs in parser or rules
- **add-utility:** Add new utility function

## Project Structure

```
flowlint-core/
├── src/
│   ├── parser/          # n8n JSON/YAML → Graph transformation
│   ├── rules/           # 14 built-in rules (R1-R14)
│   │   ├── lib/         # Individual rule implementations
│   │   ├── exports.ts   # runAllRules() entry point
│   │   └── metadata.ts  # Rule metadata and docs
│   ├── config/          # Configuration (.flowlint.yml)
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── reporter/        # GitHub Check Run formatting
│   └── schemas/         # JSON schema validation
├── tests/
│   └── rules/           # Tests for individual rules
└── dist/                # Build output (CJS + ESM)
```

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode for tests |
| `npm run build` | Build CJS and ESM distributions |

## Core Types

```typescript
interface Graph {
  nodes: NodeRef[];
  edges: Edge[];
  meta: Record<string, unknown>;
}

interface Finding {
  rule: string;
  severity: 'must' | 'should' | 'nit';
  message: string;
  line: number;
}

type RuleRunner = (graph: Graph, ctx: RuleContext) => Finding[];
```

## Conventions

- Rules in `src/rules/lib/r{N}-{name}.ts`
- Tests in `tests/rules/r{N}.test.ts`
- Exports in `src/rules/index.ts`
- Metadata in `src/rules/metadata.ts`

## Utility Functions

Key helpers in `src/utils/utils.ts`:
- `isApiNode(node)` - Check if node makes HTTP/API calls
- `isMutationNode(node)` - Check if node performs write operations
- `isNotificationNode(node)` - Check if node sends notifications
- `isTerminalNode(node)` - Check if node is workflow endpoint

## Common Tasks

### Add New Rule

1. Create `src/rules/lib/r15-example.ts` with RuleRunner
2. Export in `src/rules/index.ts`
3. Add metadata to `src/rules/metadata.ts`
4. Add tests in `tests/rules/r15.test.ts`
5. Update `src/config/default-config.ts`

### Fix Parser Bug

1. Add test case in `tests/parser/*.test.ts`
2. Fix bug in `src/parser/*.ts`
3. Run `npm test`
4. Run `npm run build`

## Guardrails

- Never commit to main branch
- Always run `npm test` before committing
- Maintain dual CJS/ESM compatibility
- Follow Conventional Commits: `type(scope): description`
- Preserve backward compatibility for published API
- Use internal scope names (parser, rule-r1) not repo name

## Related Files

- `CLAUDE.md` - Main project instructions
- `README.md` - Package documentation
- `package.json` - Package configuration
