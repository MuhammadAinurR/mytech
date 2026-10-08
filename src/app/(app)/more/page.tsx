import { Bell, Building2, Download, KeyRound, LogOut, Settings } from 'lucide-react'
import type { Metadata } from 'next'

import { ThemeSwitch } from '@/components/app-shell/theme-switch'
import { InstalledOnly } from '@/components/pwa/installed-only'
import { InsetButtonRow, InsetLinkRow, InsetRow, InsetSection } from '@/components/ui/inset-list'
import { PageHeader } from '@/components/ui/page-header'
import { SignOutForm } from '@/features/auth/components/sign-out-form'
import { requireUser } from '@/server/auth/session'

export const metadata: Metadata = { title: 'More' }

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/**
 * The mobile app's fifth tab: the account, the sections without a tab of
 * their own, appearance, and signing out.
 */
export default async function MorePage() {
  const user = await requireUser()

  return (
    <div data-grouped className="flex flex-col gap-8 pb-8">
      <PageHeader title="More" className="pb-0" />

      <InsetSection>
        <InsetLinkRow
          href="/settings"
          leading={
            <span
              aria-hidden
              className="my-3 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-fill-strong text-sm font-semibold text-muted"
            >
              {initials(user.name)}
            </span>
          }
          title={user.name}
          subtitle={user.email}
        />
      </InsetSection>

      <InsetSection>
        <InsetLinkRow href="/credentials" icon={<KeyRound />} title="Credentials" />
        <InsetLinkRow href="/companies" icon={<Building2 />} title="Companies" />
        <InsetLinkRow href="/settings" icon={<Settings />} title="Settings" />
      </InsetSection>

      <InsetSection title="Appearance">
        <InsetRow title="Theme">
          <ThemeSwitch />
        </InsetRow>
      </InsetSection>

      <InsetSection title="App">
        <InsetLinkRow
          href="/settings#notifications"
          icon={<Bell />}
          title="Notifications"
          subtitle="Invoice due-date reminders"
        />
        <InstalledOnly installed={false}>
          <InsetLinkRow href="/settings#app" icon={<Download />} title="Install Workbench" />
        </InstalledOnly>
      </InsetSection>

      <InsetSection>
        <SignOutForm>
          <InsetButtonRow type="submit" icon={<LogOut />} title="Sign out" tone="danger" />
        </SignOutForm>
      </InsetSection>
    </div>
  )
}
