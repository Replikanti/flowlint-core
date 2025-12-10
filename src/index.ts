/**
 * @flowlint/core - Core linting engine for n8n workflows
 * 
 * This package provides the core functionality for analyzing n8n workflows:
 * - Parsing n8n workflow JSON/YAML files
 * - Running linting rules
 * - Generating findings/reports
 * - Configuration management
 */

// Parser
export { parseN8n } from './parser/parser-n8n';

// Rules
export { runAllRules } from './rules';

// Schemas
export { validateN8nWorkflow, ValidationError } from './schemas';

// Config
export { 
  defaultConfig, 
  loadConfig, 
  parseConfig, 
  validateConfig,
  type FlowLintConfig,
  type RuleConfig,
  type FilesConfig,
  type ReportConfig,
} from './config';

// Types
export type {
  Finding,
  FindingSeverity,
  Graph,
  NodeRef,
  Edge,
  RuleContext,
  RuleRunner,
  PRFile,
} from './types';

// Utils
export { 
  flattenConnections, 
  isErrorProneNode, 
  getExampleLink,
  isApiNode,
  isMutationNode,
  isNotificationNode,
  isTerminalNode,
} from './utils/utils';
export { countFindingsBySeverity, sortFindingsBySeverity } from './utils/findings';
