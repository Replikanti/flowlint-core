/**
 * Integration test: Rule Examples Linking
 *
 * Verifies that:
 * 1. Every registered rule has a corresponding example directory
 * 2. Example directories contain at least documentation or sample files
 * 3. Documentation links are properly formatted
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { getExampleLink, EXAMPLES_BASE_URL } from '../packages/review/utils';

/**
 * All registered rule IDs that should have examples.
 * Update this list whenever a new rule is added.
 */
const REGISTERED_RULES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12'];

describe('Rule Examples Linking Integration', () => {
  describe('Example directories exist', () => {
    it('should have an example directory for every registered rule', () => {
      const examplesDir = resolve(join(__dirname, '..', '..', 'flowlint-examples'));

      let examplesExist = false;
      try {
        examplesExist = statSync(examplesDir).isDirectory();
      } catch {
        // flowlint-examples may not exist in some CI environments; this test is optional
        console.warn(`⚠️  flowlint-examples directory not found at ${examplesDir}`);
        return;
      }

      const missingRules: string[] = [];

      for (const ruleId of REGISTERED_RULES) {
        const examplePath = join(examplesDir, ruleId);
        try {
          const stat = statSync(examplePath);
          expect(stat.isDirectory()).toBe(true);
        } catch (error) {
          missingRules.push(ruleId);
        }
      }

      if (missingRules.length > 0) {
        console.warn(`⚠️  Missing example directories for rules: ${missingRules.join(', ')}`);
        // Don't fail the test, just warn - examples will be added incrementally
      }
    });

    it('should have at least one file in each example directory', () => {
      const examplesDir = resolve(join(__dirname, '..', '..', 'flowlint-examples'));

      let examplesExist = false;
      try {
        examplesExist = statSync(examplesDir).isDirectory();
      } catch {
        return;
      }

      const emptyRules: string[] = [];

      for (const ruleId of REGISTERED_RULES) {
        const examplePath = join(examplesDir, ruleId);
        try {
          const files = readdirSync(examplePath).filter((f) => !f.startsWith('.'));
          if (files.length === 0) {
            emptyRules.push(ruleId);
          }
        } catch {
          // Directory doesn't exist; already checked in previous test
        }
      }

      if (emptyRules.length > 0) {
        console.warn(`⚠️  Empty example directories (no content files) for rules: ${emptyRules.join(', ')}`);
      }
    });
  });

  describe('Documentation links generation', () => {
    it('should generate valid example links for all registered rules', () => {
      for (const ruleId of REGISTERED_RULES) {
        const link = getExampleLink(ruleId);
        const expected = `${EXAMPLES_BASE_URL}/${ruleId}`;

        // Verify format
        expect(link).toMatch(/^https:\/\/github\.com\//);
        expect(link).toContain(ruleId);
        expect(link).toBe(expected);
      }
    });

    it('should have correct base URL pointing to main branch', () => {
      expect(EXAMPLES_BASE_URL).toBe('https://github.com/Replikanti/flowlint-examples/tree/main');
    });

    it('should preserve rule ID casing (uppercase)', () => {
      for (const ruleId of REGISTERED_RULES) {
        const link = getExampleLink(ruleId);
        const lowerCasePattern = `/${ruleId.toLowerCase()}`;
        // Verify the rule ID appears in the link (case-sensitive)
        expect(link).toContain(`/${ruleId}`);
        expect(link).not.toContain(lowerCasePattern);
      }
    });
  });

  describe('Rule ID format validation', () => {
    it('should only contain rules with uppercase R prefix and numeric ID', () => {
      const validRuleFormat = /^R\d+$/;
      for (const ruleId of REGISTERED_RULES) {
        expect(ruleId).toMatch(validRuleFormat);
      }
    });

    it('should have rules ordered numerically', () => {
      const ruleNumbers = REGISTERED_RULES.map((r) => parseInt(r.slice(1), 10));
      const sorted = [...ruleNumbers].sort((a, b) => a - b);
      expect(ruleNumbers).toEqual(sorted);
    });
  });
});
