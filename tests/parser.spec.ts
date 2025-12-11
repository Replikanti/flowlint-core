import { describe, it, expect } from 'vitest';
import { parseN8n } from '../src/parser/parser-n8n';
import fs from 'fs';
import path from 'path';

describe('N8n Parser', () => {
    it('should parse a valid workflow JSON', () => {
        const jsonContent = fs.readFileSync(path.join(__dirname, 'fixtures/valid-workflow.json'), 'utf-8');
        const graph = parseN8n(jsonContent);

        expect(graph).toBeDefined();
        expect(graph.nodes.length).toBe(2);
        
        const startNode = graph.nodes.find(n => n.name === 'Start');
        expect(startNode).toBeDefined();
        expect(startNode?.type).toBe('n8n-nodes-base.start');
    });

    it('should throw error on invalid JSON', () => {
        expect(() => parseN8n('{ "broken": ')).toThrow();
    });
});