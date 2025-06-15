import { JSONValue } from '../types'

/**
 * Extracts a value from a nested object using a dot-notation path.
 * Supports both object properties and array indices.
 *
 * @param obj - The source object to extract from
 * @param path - Dot-notation path (e.g., "user.name", "items.0", "users.1.email")
 * @returns The value at the specified path, or undefined if not found
 *
 * @example
 * ```typescript
 * const data = { users: [{ name: 'John' }, { name: 'Jane' }] }
 * getValueFromPath(data, 'users.0.name') // Returns 'John'
 * getValueFromPath(data, 'users.1.name') // Returns 'Jane'
 * ```
 */
export function getValueFromPath(obj: JSONValue, path: string): JSONValue | undefined {
  if (!path) return undefined

  const parts = path.split('.')
  let current: JSONValue | undefined = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }

    // Only allow property/index access on objects and arrays
    if (typeof current !== 'object') {
      return undefined
    }

    current = (current as Record<string, JSONValue>)[part]
  }

  return current
}
