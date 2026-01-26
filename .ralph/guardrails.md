# Guardrails - FlowLint Core

## Rules

### G1: Never commit to main
- **Trigger:** `git commit` on main branch
- **Instruction:** Create feature branch (feat/, fix/, chore/, etc.)
- **Discovered:** Iteration 0

### G2: Always run tests before commit
- **Trigger:** Before every `git commit`
- **Instruction:** Run `npm test` and verify all tests pass
- **Discovered:** Iteration 0

### G3: Conventional Commits
- **Trigger:** Every commit message
- **Instruction:** Format `type(scope): description` - examples: `feat(parser): add YAML support`, `fix(rule-r1): correct regex`
- **Discovered:** Iteration 0

### G4: Preserve dual CJS/ESM build
- **Trigger:** Changes in `src/`
- **Instruction:** After changes run `npm run build` and verify both `dist/index.js` (CJS) and `dist/index.mjs` (ESM) are generated
- **Discovered:** Iteration 0

### G5: Backward compatibility
- **Trigger:** Changes in public API (exported functions/types)
- **Instruction:** Don't change signatures of existing functions, only add new ones or mark as deprecated
- **Discovered:** Iteration 0

### G6: Test coverage
- **Trigger:** Adding new code
- **Instruction:** Add tests for new code, maintain coverage >90%
- **Discovered:** Iteration 0

### G7: Use internal scope names
- **Trigger:** Commit message scope
- **Instruction:** Use internal module names (parser, rule-r1, utils) not repo name (flowlint-core)
- **Discovered:** Iteration 0

### G8: Test on real-world workflows
- **Trigger:** Changes in rules or parser
- **Instruction:** Test on workflows from `../flowlint-examples/` before commit
- **Discovered:** Iteration 0
