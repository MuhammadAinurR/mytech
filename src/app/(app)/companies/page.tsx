import { Building2 } from 'lucide-react'
import type { Metadata } from 'next'

import { CachedView } from '@/components/app-shell/cached-view'
import { PageSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { CompaniesTable } from '@/features/companies/components/companies-table'
import {
  AddCompanyButton,
  CompanyDialogProvider,
} from '@/features/companies/components/company-dialog'
import { requireUser } from '@/server/auth/session'
import { listCompanies } from '@/server/queries/companies'
import type { CurrentUser } from '@/server/queries/users'

export const metadata: Metadata = { title: 'Companies' }

export default async function CompaniesPage() {
  const user = await requireUser()
  return (
    <CachedView cacheKey="/companies" content={renderCompanies(user)} fallback={<PageSkeleton />} />
  )
}

async function renderCompanies(user: CurrentUser) {
  const companies = await listCompanies(user.id)

  return (
    <CompanyDialogProvider companies={companies} defaultCurrency={user.defaultCurrency}>
      <PageHeader
        back={{ href: '/more', label: 'More', mobileOnly: true }}
        title="Companies"
        description="The businesses you invoice from, each with its own numbering."
        actions={<AddCompanyButton />}
        mobileActions={<AddCompanyButton variant="glass" />}
      />
      {companies.length > 0 ? (
        <div className="md:pt-2">
          <CompaniesTable companies={companies} />
        </div>
      ) : (
        <EmptyState
          className="border-t border-border"
          icon={<Building2 />}
          title="No companies yet"
          description="Add the business you invoice from. Its details and numbering go on every invoice."
          action={<AddCompanyButton variant="secondary" />}
        />
      )}
    </CompanyDialogProvider>
  )
}
