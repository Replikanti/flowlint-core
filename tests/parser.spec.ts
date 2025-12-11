import { describe, it, expect } from 'vitest';
import { parseN8n } from '../src/parser';
import fs from 'fs';
import path from 'path';

describe('N8n Parser', () => {
    it('should parse a valid workflow JSON', () => {
        const jsonContent = fs.readFileSync(path.join(__dirname, 'fixtures/valid-workflow.json'), 'utf-8');
        const graph = parseN8n(jsonContent);

        expect(graph).toBeDefined();
        expect(graph.nodes.size).toBe(2);
        expect(graph.edges.length).toBe(1);
    });
    it('should throw error on invalid JSON', () => {
        expect(() => parseN8n('{ "broken": ')).toThrow();
    });
});