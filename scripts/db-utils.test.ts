import { describe, expect, it } from 'vitest'

import { databaseName } from './db-utils'

describe('databaseName', () => {
  it('allows workbench_* databases', () => {
    expect(databaseName('postgres://u:p@localhost:5432/workbench_dev')).toBe('workbench_dev')
    expect(databaseName('postgres://u:p@localhost:5432/workbench_test')).toBe('workbench_test')
  })

  it('refuses anything else', () => {
    expect(() => databaseName('postgres://u:p@localhost:5432/postgres')).toThrow(/Refusing/)
    expect(() => databaseName('postgres://u:p@localhost:5432/sabarmas')).toThrow(/Refusing/)
    expect(() => databaseName('postgres://u:p@localhost:5432/workbench')).toThrow(/Refusing/)
    expect(() => databaseName('postgres://u:p@localhost:5432/workbench_x;drop')).toThrow(/Refusing/)
  })
})
