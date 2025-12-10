import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import workflowSchema from './n8n-workflow.schema.json';
import { flattenConnections, buildValidationErrors } from '../utils/utils';

// Custom error class for validation failures
export class ValidationError extends Error {
  constructor(
    public errors: Array<{
      path: string;
      message: string;
      suggestion?: string;
    }>
  ) {
    super(`Workflow validation failed: ${errors.length} error(s)`);
    this.name = 'ValidationError';
  }
}

// Dummy validator that always passes
const createDummyValidator = (): ValidateFunction => {
  const v: any = () => true;
  v.errors = [];
  return v as ValidateFunction;
};

// Singleton instance
let validatorInstance: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (validatorInstance) return validatorInstance;

  // Detect Node.js environment safely
  // Use optional chaining to satisfy SonarQube
  const isNode = typeof process !== 'undefined' && process?.versions?.node != null;

  if (isNode) {
    try {
      const ajv = new Ajv({
        allErrors: true,
        strict: false,
        verbose: true,
        code: { source: true, es5: true }
      });
      addFormats(ajv);
      validatorInstance = ajv.compile(workflowSchema);
    } catch (error) {
      // Fallback to dummy validator if compilation fails (e.g. due to strict CSP in some environments)
      console.warn('Failed to compile JSON schema validator, falling back to dummy validator:', error);
      validatorInstance = createDummyValidator();
    }
  } else {
    validatorInstance = createDummyValidator();
  }

  return validatorInstance;
}

/**
 * Throws a ValidationError if the provided set contains items.
 * Centralizes the pattern of checking validation results and throwing errors.
 * 
 * @param items - Set of items that represent validation failures
 * @param config - Configuration for building error messages
 * @throws ValidationError if items set is not empty
 */
function throwIfInvalid<T>(
  items: Set<T>,
  config: {
    path: string;
    messageTemplate: (item: T) => string;
    suggestionTemplate: (item: T) => string;
  }
): void {
  if (items.size > 0) {
    const errors = buildValidationErrors(items, config);
    throw new ValidationError(errors);
  }
}

/**
 * Check for duplicate node IDs in the workflow
 */
function checkDuplicateNodeIds(data: any): void {
  if (!Array.isArray(data.nodes)) return;

  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const node of data.nodes) {
    if (node.id && seen.has(node.id)) {
      duplicates.add(node.id);
    }
    if (node.id) {
      seen.add(node.id);
    }
  }

  throwIfInvalid(duplicates, {
    path: 'nodes[].id',
    messageTemplate: (id) => `Duplicate node ID: "${id}"`,
    suggestionTemplate: (id) => `Each node must have a unique ID. Remove or rename the duplicate node with ID "${id}".`,
  });
}

/**
 * Check for orphaned connections (references to non-existent nodes)
 */
function checkOrphanedConnections(data: any): void {
  if (!data.connections || !Array.isArray(data.nodes)) return;

  const nodeIds = new Set<string>();
  const nodeNames = new Set<string>();

  // Collect all node IDs and names
  for (const node of data.nodes) {
    if (node.id) nodeIds.add(node.id);
    if (node.name) nodeNames.add(node.name);
  }

  const orphanedRefs = new Set<string>();

  // Check all connection targets
  Object.entries(data.connections).forEach(([sourceId, channels]) => {
    // Check if source exists
    if (!nodeIds.has(sourceId) && !nodeNames.has(sourceId)) {
      orphanedRefs.add(sourceId);
    }

    // Check targets
    if (typeof channels === 'object' && channels !== null) {
      Object.values(channels).forEach((connArray: any) => {
        const flatConnections = flattenConnections(connArray);
        flatConnections.forEach((conn: any) => {
          if (conn?.node) {
            if (!nodeIds.has(conn.node) && !nodeNames.has(conn.node)) {
              orphanedRefs.add(conn.node);
            }
          }
        });
      });
    }
  });

  throwIfInvalid(orphanedRefs, {
    path: 'connections',
    messageTemplate: (ref) => `Orphaned connection reference: "${ref}"`,
    suggestionTemplate: (ref) => `Connection references node "${ref}" which does not exist. Add the missing node or remove the invalid connection.`,
  });
}

/**
 * Validate n8n workflow structure
 * Throws ValidationError with detailed messages if validation fails
 */
export function validateN8nWorkflow(data: any): void {
  const validate = getValidator();

  // Basic schema validation
  if (!validate(data)) {
    const errors = (validate.errors || []).map((err: any) => {
      const path = err.instancePath || err.schemaPath;
      const message = err.message || 'Validation error';
      let suggestion = '';

      // Provide helpful suggestions based on error type
      if (err.keyword === 'required') {
        const missing = err.params?.missingProperty;
        suggestion = `Add the required field "${missing}" to the workflow.`;
      } else if (err.keyword === 'type') {
        const expected = err.params?.type;
        suggestion = `The field should be of type "${expected}".`;
      } else if (err.keyword === 'minLength') {
        suggestion = 'This field cannot be empty.';
      }

      return { path, message, suggestion };
    });

    throw new ValidationError(errors);
  }

  // Additional custom validations
  checkDuplicateNodeIds(data);
  checkOrphanedConnections(data);
}

