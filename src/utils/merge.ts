/**
 * Deep merge utilities
 * Shared logic for merging configuration objects
 */

/**
 * Deep merge configuration objects
 */
export function deepMerge<T>(base: T, override: Record<string, unknown>): T {
  const baseCopy = JSON.parse(JSON.stringify(base));
  if (!override) return baseCopy;
  return mergeInto(baseCopy as any, override) as T;
}

/**
 * Recursively merge source object into target object
 */
export function mergeInto(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
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
