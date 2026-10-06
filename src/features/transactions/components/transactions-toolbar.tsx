import { ListToolbar } from '@/components/list-toolbar'

import { type TransactionType } from '../schema'

type Filters = { month: string; type?: TransactionType; q?: string }

export function TransactionsToolbar({
  filters,
  hrefFor,
}: {
  filters: Filters
  hrefFor: (patch: Partial<Filters>) => string
}) {
  const types: { value: TransactionType | undefined; label: string }[] = [
    { value: undefined, label: 'All' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
  ]
  return (
    <ListToolbar
      filterLabel="Filter by type"
      current={filters.type}
      filters={types.map((option) => ({
        ...option,
        href: hrefFor({ type: option.value, q: filters.q }),
      }))}
      search={{
        action: '/transactions',
        placeholder: 'Search category or note',
        label: 'Search transactions',
        value: filters.q,
        keep: { month: filters.month, type: filters.type },
        clearHref: hrefFor({ type: filters.type, q: undefined }),
      }}
    />
  )
}
