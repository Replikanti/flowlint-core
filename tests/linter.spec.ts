import { describe, it, expect } from 'vitest';
import { runAllRules } from '../src/rules'; 
import { parseN8n } from '../src/parser/parser-n8n';
import { defaultConfig } from '../src/config';
import fs from 'fs';
import path from 'path';

describe('Linting Engine', () => {
    const validJson = fs.readFileSync(path.join(__dirname, 'fixtures/valid-workflow.json'), 'utf-8');
    const graph = parseN8n(validJson);

    it('should run without crashing on valid workflow', () => {
        const findings = runAllRules(graph, { cfg: defaultConfig, path: 'test.json' });
        expect(Array.isArray(findings)).toBe(true);
    });
});