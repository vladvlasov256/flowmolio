import { getValueFromPath } from '../../src/utils/dataUtils'

describe('getValueFromPath', () => {
  it('should extract simple object properties', () => {
    const data = { name: 'John', age: 30 }
    expect(getValueFromPath(data, 'name')).toBe('John')
    expect(getValueFromPath(data, 'age')).toBe(30)
  })

  it('should extract nested object properties', () => {
    const data = { user: { profile: { name: 'Jane' } } }
    expect(getValueFromPath(data, 'user.profile.name')).toBe('Jane')
  })

  it('should extract array elements by index', () => {
    const data = { items: ['first', 'second', 'third'] }
    expect(getValueFromPath(data, 'items.0')).toBe('first')
    expect(getValueFromPath(data, 'items.1')).toBe('second')
    expect(getValueFromPath(data, 'items.2')).toBe('third')
  })

  it('should extract from nested arrays and objects', () => {
    const data = {
      users: [
        { name: 'Alice', contacts: { email: 'alice@example.com' } },
        { name: 'Bob', contacts: { email: 'bob@example.com' } }
      ]
    }
    expect(getValueFromPath(data, 'users.0.name')).toBe('Alice')
    expect(getValueFromPath(data, 'users.1.contacts.email')).toBe('bob@example.com')
  })

  it('should return undefined for missing paths', () => {
    const data = { user: { name: 'John' } }
    expect(getValueFromPath(data, 'user.missing')).toBeUndefined()
    expect(getValueFromPath(data, 'missing.path')).toBeUndefined()
    expect(getValueFromPath(data, 'user.name.invalid')).toBeUndefined()
  })

  it('should return undefined for empty path', () => {
    const data = { name: 'John' }
    expect(getValueFromPath(data, '')).toBeUndefined()
  })

  it('should handle null values gracefully', () => {
    const data = { user: null }
    expect(getValueFromPath(data, 'user.name')).toBeUndefined()
  })

  it('should handle array access on non-arrays', () => {
    const data = { 
      string: 'hello',
      number: 42,
      boolean: true
    }
    expect(getValueFromPath(data, 'string.0')).toBeUndefined()
    expect(getValueFromPath(data, 'number.length')).toBeUndefined()
    expect(getValueFromPath(data, 'boolean.toString')).toBeUndefined()
  })

  it('should handle complex mixed structures', () => {
    const data = {
      api: {
        responses: [
          { 
            data: { 
              items: [
                { id: 1, title: 'First Item' },
                { id: 2, title: 'Second Item' }
              ] 
            } 
          }
        ]
      }
    }
    expect(getValueFromPath(data, 'api.responses.0.data.items.1.title')).toBe('Second Item')
  })
})