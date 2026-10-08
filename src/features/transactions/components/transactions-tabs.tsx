import { TabsNav } from '@/components/ui/tabs-nav'

export function TransactionsTabs({ current }: { current: 'all' | 'recurring' | 'renewals' }) {
  // Money pages sit on the grouped canvas on mobile.
  return (
    <div data-grouped>
      <TabsNav
        label="Transactions sections"
        current={current}
        items={[
          { value: 'all', label: 'Transactions', href: '/transactions' },
          { value: 'recurring', label: 'Recurring', href: '/transactions/recurring' },
          { value: 'renewals', label: 'Renewals', href: '/transactions/renewals' },
        ]}
      />
    </div>
  )
}
