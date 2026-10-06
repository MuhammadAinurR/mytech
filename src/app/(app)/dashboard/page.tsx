import type { Metadata } from 'next'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { logoutAction } from '@/features/auth/actions'
import { requireUser } from '@/server/auth/session'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await requireUser()
  return (
    <main>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${user.email}`}
        actions={
          <form action={logoutAction}>
            <Button type="submit">Sign out</Button>
          </form>
        }
      />
    </main>
  )
}
