import { describe, it, expect } from 'vitest';
import { runAllRules } from '../src/rules';
import { parseN8n } from '../src/parser/parser-n8n';
import { defaultConfig } from '../src/config';
import type { RuleRunner } from '../src/types';
import path from 'node:path';
import fs from 'node:fs';

describe('Linting Engine', () => {
    const validJson = fs.readFileSync(path.join(__dirname, 'fixtures/valid-workflow.json'), 'utf-8');
    const graph = parseN8n(validJson);

    it('should run without crashing on valid workflow', () => {
        const findings = runAllRules(graph, { cfg: defaultConfig, path: 'test.json' });
        expect(Array.isArray(findings)).toBe(true);
    });
});

describe('Custom Rules Support', () => {
    const validJson = fs.readFileSync(path.join(__dirname, 'fixtures/valid-workflow.json'), 'utf-8');
    const graph = parseN8n(validJson);
    const ctx = { cfg: defaultConfig, path: 'test.json' };

    it('should run extra custom rules when provided', () => {
        const customRule: RuleRunner = (_graph, ruleCtx) => [{
            rule: 'CUSTOM1',
            severity: 'should',
            path: ruleCtx.path,
            message: 'Custom rule triggered',
        }];

        const findings = runAllRules(graph, ctx, [customRule]);
        expect(findings.some(f => f.rule === 'CUSTOM1')).toBe(true);
    });

    it('should run multiple custom rules', () => {
        const customRule1: RuleRunner = (_graph, ruleCtx) => [{
            rule: 'CUSTOM1',
            severity: 'should',
            path: ruleCtx.path,
            message: 'Custom rule 1 triggered',
        }];
        const customRule2: RuleRunner = (_graph, ruleCtx) => [{
            rule: 'CUSTOM2',
            severity: 'nit',
            path: ruleCtx.path,
            message: 'Custom rule 2 triggered',
        }];

        const findings = runAllRules(graph, ctx, [customRule1, customRule2]);
        expect(findings.some(f => f.rule === 'CUSTOM1')).toBe(true);
        expect(findings.some(f => f.rule === 'CUSTOM2')).toBe(true);
    });

    it('should work without extra rules (backward compatible)', () => {
        const findings = runAllRules(graph, ctx);
        expect(Array.isArray(findings)).toBe(true);
    });

    it('should run core rules alongside custom rules', () => {
        const customRule: RuleRunner = () => [];  // Returns no findings

        const findingsWithCustom = runAllRules(graph, ctx, [customRule]);
        const findingsWithoutCustom = runAllRules(graph, ctx);

        // Core rules should produce the same results
        expect(findingsWithCustom.length).toBeGreaterThanOrEqual(findingsWithoutCustom.length);
    });
});
