import { Repeat } from 'lucide-react'
import type { Metadata } from 'next'

import { CachedView } from '@/components/app-shell/cached-view'
import { PageSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { NewRuleButton, RuleDialogProvider } from '@/features/recurring/components/rule-dialog'
import { RulesTable } from '@/features/recurring/components/rules-table'
import { TransactionsTabs } from '@/features/transactions/components/transactions-tabs'
import { todayInTimeZone } from '@/lib/dates'
import { requireUser } from '@/server/auth/session'
import { listRules } from '@/server/queries/recurring'
import { listCategories } from '@/server/queries/transactions'
import type { CurrentUser } from '@/server/queries/users'

export const metadata: Metadata = { title: 'Recurring' }

export default async function RecurringPage() {
  const user = await requireUser()
  return (
    <CachedView
      cacheKey="/transactions/recurring"
      content={renderRecurring(user)}
      fallback={<PageSkeleton />}
    />
  )
}

async function renderRecurring(user: CurrentUser) {
  const today = todayInTimeZone(user.timezone)
  const [rules, categories] = await Promise.all([
    listRules(user.id, today),
    listCategories(user.id),
  ])

  return (
    <RuleDialogProvider
      defaults={{ currency: user.defaultCurrency, today }}
      categories={categories}
    >
      <PageHeader
        title="Transactions"
        description="Rules create entries on their dates, automatically."
        actions={<NewRuleButton />}
        mobileActions={<NewRuleButton variant="glass" />}
        className="pb-4"
      />
      <TransactionsTabs current="recurring" />
      {rules.length > 0 ? (
        <div className="pt-2">
          <RulesTable rules={rules} today={today} />
        </div>
      ) : (
        <EmptyState
          icon={<Repeat />}
          title="No recurring rules yet"
          description="Add rent, subscriptions, or a yearly domain renewal and the entries appear on their own."
          action={<NewRuleButton variant="secondary" />}
        />
      )}
    </RuleDialogProvider>
  )
}
