/**
 * Isomorphic config loader for FlowLint
 * Works in both Node.js and browser environments
 */

import YAML from 'yaml';
import { defaultConfig, type FlowLintConfig } from './default-config';

/**
 * Deep merge configuration objects
 */
function deepMerge<T>(base: T, override: Record<string, unknown>): T {
  const baseCopy = JSON.parse(JSON.stringify(base));
  if (!override) return baseCopy;
  return mergeInto(baseCopy as Record<string, unknown>, override) as T;
}

function mergeInto(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      target[key] = value;
    } else if (typeof value === 'object') {
      if (typeof target[key] !== 'object' || target[key] === null) {
        target[key] = {};
      }
      mergeInto(target[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
  return target;
}

/**
 * Parse config from YAML string
 */
export function parseConfig(content: string): FlowLintConfig {
  const parsed = (YAML.parse(content) as Record<string, unknown>) || {};
  return deepMerge(defaultConfig, parsed);
}

/**
 * Load config - isomorphic function
 * In browser: returns defaultConfig (no filesystem access)
 * In Node.js: optionally loads from file path
 */
export function loadConfig(configPath?: string): FlowLintConfig {
  // Browser detection - return default config
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    return defaultConfig;
  }

  // Node.js: if path provided, try to load
  if (configPath) {
    return loadConfigFromFile(configPath);
  }

  // Try to find config in current directory
  return loadConfigFromCwd();
}

/**
 * Load config from a specific file path (Node.js only)
 */
function loadConfigFromFile(configPath: string): FlowLintConfig {
  try {
    // Dynamic require to avoid bundling fs
    const fs = require('fs');
    
    if (!fs.existsSync(configPath)) {
      return defaultConfig;
    }
    
    const content = fs.readFileSync(configPath, 'utf-8');
    return parseConfig(content);
  } catch {
    return defaultConfig;
  }
}

/**
 * Find and load config from current working directory (Node.js only)
 */
function loadConfigFromCwd(): FlowLintConfig {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const candidates = ['.flowlint.yml', '.flowlint.yaml', 'flowlint.config.yml'];
    const cwd = process.cwd();
    
    for (const candidate of candidates) {
      const configPath = path.join(cwd, candidate);
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        return parseConfig(content);
      }
    }
    
    return defaultConfig;
  } catch {
    return defaultConfig;
  }
}

/**
 * Validate config structure
 */
export function validateConfig(config: unknown): config is FlowLintConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    'files' in c &&
    'report' in c &&
    'rules' in c &&
    typeof c.files === 'object' &&
    typeof c.report === 'object' &&
    typeof c.rules === 'object'
  );
}


