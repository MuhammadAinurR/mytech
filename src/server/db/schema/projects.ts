import { sql } from 'drizzle-orm'
import { check, date, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { id, timestamps } from './columns'
import { projectStatus } from './enums'
import { users } from './users'

export const projects = pgTable(
  'projects',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text(),
    status: projectStatus().notNull().default('todo'),
    startDate: date({ mode: 'string' }),
    endDate: date({ mode: 'string' }),
    // Order within its status column on the board (0 = top).
    position: integer().notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index('projects_user_board_idx').on(table.userId, table.status, table.position),
    index('projects_user_dates_idx').on(table.userId, table.startDate, table.endDate),
    check('projects_name_length', sql`length(btrim(${table.name})) between 1 and 160`),
    check(
      'projects_description_length',
      sql`${table.description} is null or length(${table.description}) <= 2000`,
    ),
    check('projects_position_non_negative', sql`${table.position} >= 0`),
    // Ongoing work has a planned window.
    check(
      'projects_ongoing_has_dates',
      sql`${table.status} <> 'ongoing' or (${table.startDate} is not null and ${table.endDate} is not null)`,
    ),
    check(
      'projects_end_after_start',
      sql`${table.startDate} is null or ${table.endDate} is null or ${table.endDate} >= ${table.startDate}`,
    ),
  ],
)

export type ProjectRow = typeof projects.$inferSelect
