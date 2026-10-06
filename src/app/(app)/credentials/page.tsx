import { KeyRound } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ListToolbar } from '@/components/list-toolbar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import {
  AddCredentialButton,
  CredentialDialogProvider,
} from '@/features/credentials/components/credential-dialog'
import { CredentialsTable } from '@/features/credentials/components/credentials-table'
import {
  CREDENTIAL_TYPE_LABELS,
  CREDENTIAL_TYPES,
  credentialListQuerySchema,
} from '@/features/credentials/schema'
import { withParams } from '@/lib/url'
import { requireUser } from '@/server/auth/session'
import { listCredentials } from '@/server/queries/credentials'

export const metadata: Metadata = { title: 'Credentials' }

export default async function CredentialsPage({ searchParams }: PageProps<'/credentials'>) {
  const user = await requireUser()
  const query = credentialListQuerySchema.parse(await searchParams)
  const list = await listCredentials(user.id, query)
  const href = (patch: { type?: string; q?: string; page?: number }) =>
    withParams('/credentials', { type: query.type, q: query.q, ...patch })
  const filtered = Boolean(query.type || query.q)

  return (
    <CredentialDialogProvider>
      <PageHeader
        title="Credentials"
        description="Encrypted at rest. Every reveal and copy is logged."
        actions={<AddCredentialButton />}
      />
      {list.total > 0 || filtered ? (
        <ListToolbar
          filterLabel="Filter by type"
          current={query.type}
          filters={[
            { value: undefined, label: 'All', href: href({ type: undefined }) },
            ...CREDENTIAL_TYPES.map((type) => ({
              value: type,
              label: CREDENTIAL_TYPE_LABELS[type],
              href: href({ type }),
            })),
          ]}
          search={{
            action: '/credentials',
            placeholder: 'Search name or host',
            label: 'Search credentials',
            value: query.q,
            keep: { type: query.type },
            clearHref: href({ q: undefined }),
          }}
        />
      ) : null}

      {list.items.length > 0 ? (
        <>
          <CredentialsTable items={list.items} />
          <Pagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            hrefForPage={(page) => href({ page })}
          />
        </>
      ) : filtered ? (
        <EmptyState
          className="border-t border-border"
          title="Nothing matches"
          description={
            query.q ? `No credentials match “${query.q}”.` : 'No credentials of this type.'
          }
          action={
            <Button asChild size="sm">
              <Link href="/credentials">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          className="border-t border-border"
          icon={<KeyRound />}
          title="No credentials yet"
          description="Keep server, domain, and other logins here. Secrets are encrypted before they’re saved."
          action={<AddCredentialButton variant="secondary" />}
        />
      )}
    </CredentialDialogProvider>
  )
}
