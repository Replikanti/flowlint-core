import { describe, it, expect } from 'vitest';
import { parseN8n } from '../src/parser/parser-n8n';
import fs from 'node:fs';
import path from 'node:path';
import { ValidationError } from '../src/schemas';

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

    it('should parse a valid workflow YAML', () => {
        const yamlContent = `
nodes:
  - parameters: {}
    name: Start
    type: n8n-nodes-base.start
    id: 247d7
connections:
  Start:
    main:
      - []
`;
        const graph = parseN8n(yamlContent);
        expect(graph).toBeDefined();
        expect(graph.nodes.length).toBe(1);
        expect(graph.nodes[0].name).toBe('Start');
    });

    it('should throw ValidationError on missing required fields', () => {
        const invalidContent = JSON.stringify({ nodes: [] }); // missing connections
        expect(() => parseN8n(invalidContent)).toThrow(ValidationError);
    });

    it('should throw error on invalid content (neither JSON nor YAML)', () => {
        // YAML parser is very permissive, so "{" is valid string.
        // But "{ broken" is invalid JSON and invalid YAML if it looks like flow mapping.
        expect(() => parseN8n('{ "broken": ')).toThrow();
    });
});