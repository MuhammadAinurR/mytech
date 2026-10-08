import { Plus, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CachedView } from '@/components/app-shell/cached-view'
import { PageSkeleton } from '@/components/page-skeleton'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { GlassButton } from '@/components/ui/glass-button'
import { PageHeader } from '@/components/ui/page-header'
import { AddClientButton, ClientDialogProvider } from '@/features/clients/components/client-dialog'
import { ClientsTable } from '@/features/clients/components/clients-table'
import {
  CompanyDialogProvider,
  EditCompanyButton,
} from '@/features/companies/components/company-dialog'
import { CompanyLogo } from '@/features/companies/components/company-logo'
import { formatInvoiceNumber } from '@/features/invoices/lib/totals'
import { uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import { listClients } from '@/server/queries/clients'
import { getCompany } from '@/server/queries/companies'
import type { CurrentUser } from '@/server/queries/users'

export async function generateMetadata({
  params,
}: PageProps<'/companies/[id]'>): Promise<Metadata> {
  const user = await requireUser()
  const id = uuidSchema.safeParse((await params).id)
  const company = id.success ? await getCompany(user.id, id.data) : null
  return { title: company?.name ?? 'Company' }
}

export default async function CompanyPage({ params }: PageProps<'/companies/[id]'>) {
  const user = await requireUser()
  const id = uuidSchema.safeParse((await params).id)
  if (!id.success) notFound()
  return (
    <CachedView
      cacheKey={`/companies/${id.data}`}
      content={renderCompany(user, id.data)}
      fallback={<PageSkeleton rows={4} />}
    />
  )
}

async function renderCompany(user: CurrentUser, id: string) {
  const [company, clients] = await Promise.all([getCompany(user.id, id), listClients(user.id, id)])
  if (!company) notFound()

  return (
    // `?new=1` on this page means "new client", so the company dialog ignores it.
    <CompanyDialogProvider
      companies={[company]}
      defaultCurrency={user.defaultCurrency}
      openFromUrl={false}
    >
      <ClientDialogProvider companyId={company.id} companyName={company.name}>
        <PageHeader
          back={{ href: '/companies', label: 'Companies' }}
          descriptionOnMobile
          title={
            <span className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="contents">
                <CompanyLogo company={company} />
              </span>
              <span className="truncate">{company.name}</span>
            </span>
          }
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {company.email ? <span>{company.email}</span> : null}
              <span>
                Next invoice{' '}
                <span className="font-mono text-fg">
                  {formatInvoiceNumber(company.invoicePrefix, company.nextInvoiceNumber)}
                </span>
              </span>
            </span>
          }
          actions={
            <>
              <EditCompanyButton company={company} />
              <Button asChild variant="primary">
                <Link href={`/invoices/new?company=${company.id}`}>
                  <Plus />
                  New invoice
                </Link>
              </Button>
            </>
          }
          mobileActions={
            <>
              <EditCompanyButton company={company} variant="glass" />
              <GlassButton asChild variant="accent" aria-label="New invoice">
                <Link href={`/invoices/new?company=${company.id}`}>
                  <Plus />
                </Link>
              </GlassButton>
            </>
          }
        />

        <section aria-labelledby="clients-heading" className="border-t border-border">
          <div className="flex items-end justify-between gap-4 px-(--gutter) pt-6 pb-4">
            <div className="flex flex-col gap-1">
              <h2 id="clients-heading" className="text-md font-semibold">
                Clients
              </h2>
              {/* The empty state explains this on its own. */}
              {clients.length > 0 ? (
                <p className="text-sm text-muted">
                  Pick one on a new invoice and its details fill in for you.
                </p>
              ) : null}
            </div>
            {clients.length > 0 ? <AddClientButton /> : null}
          </div>
          {clients.length > 0 ? (
            <div className="border-t border-border pt-2 md:border-t-0">
              <ClientsTable clients={clients} />
            </div>
          ) : (
            <EmptyState
              className="border-t border-border"
              icon={<Users />}
              title="No saved clients yet"
              description={`Save the clients you bill from ${company.name}, then pick them on new invoices instead of typing their details.`}
              action={<AddClientButton />}
            />
          )}
        </section>
      </ClientDialogProvider>
    </CompanyDialogProvider>
  )
}
